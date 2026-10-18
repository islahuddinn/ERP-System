import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditContextService } from "../audit/audit-context.service";
import { PurchaseReturnRepository, ReturnItemDiff } from "./purchase-return.repository";
import { CreatePurchaseReturnDto } from "./dto/create-purchase-return.dto";
import { UpdatePurchaseReturnDto } from "./dto/update-purchase-return.dto";
import { UpdateReturnStatusDto } from "./dto/update-return-status.dto";
import { DecideReturnApprovalDto } from "./dto/decide-return-approval.dto";
import { PurchaseReturnQueryDto } from "./dto/purchase-return-query.dto";
import { RequestWithUser } from "../common/interfaces";
import { ReturnStatus } from "@prisma/tenant-client";

@Injectable()
export class PurchaseReturnService {
  constructor(
    private readonly repo: PurchaseReturnRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async create(dto: CreatePurchaseReturnDto, req: RequestWithUser) {
    const { id: userId } = req.user;
    const { items, purchaseOrderId, grnId, returnDate, approverIds = [], ...rest } = dto;

    await this.repo.validateApproverIds(approverIds);

    const returnNumber = await this.repo.generateReturnNumber();

    const batchPrices = await this.repo.findBatchUnitCosts(items.map((i) => i.batchId));

    const mappedItems = items.map((item) => {
      // Use the price the user entered on the form if provided; otherwise default
      // to the batch's unit cost (which can be 0 for zero-cost batches).
      const unitPrice = item.unitPrice ?? batchPrices.get(item.batchId) ?? 0;
      return {
        rawMaterialId: item.rawMaterialId,
        batchId: item.batchId,
        grnItemId: item.grnItemId,
        purchaseItemId: item.purchaseItemId,
        quantity: item.quantity,
        unitPrice,
        totalPrice: item.quantity * unitPrice,
        reason: item.reason,
      };
    });

    const totalAmount = mappedItems.reduce((sum, i) => sum + i.totalPrice, 0);

    const ret = await this.repo.create(
      {
        ...rest,
        returnNumber,
        purchaseOrderId,
        grnId: grnId ?? null,
        returnDate: returnDate ? new Date(returnDate) : new Date(),
        totalAmount,
        createdById: userId,
      },
      mappedItems,
      [...new Set(approverIds)],
    );

    this.auditContext.setEntityLabel(ret.returnNumber);

    return ret;
  }

  async findAll(queryDto: PurchaseReturnQueryDto) {
    return this.repo.findAll(queryDto);
  }

  async findOne(returnId: string) {
    const ret = await this.repo.findById(returnId);
    if (!ret) throw new NotFoundException(`Purchase return "${returnId}" not found`);
    return ret;
  }

  async update(returnId: string, dto: UpdatePurchaseReturnDto, req: RequestWithUser) {
    const { id: userId } = req.user;
    const existing = await this.findOne(returnId);

    if (existing.status !== ReturnStatus.DRAFT) {
      throw new BadRequestException("Only DRAFT returns can be edited");
    }

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.returnNumber);

    const { items, returnDate, approverIds, ...rest } = dto;

    if (approverIds !== undefined) {
      await this.repo.validateApproverIds(approverIds);
    }

    let diff: ReturnItemDiff | undefined;
    let totalAmount = Number(existing.totalAmount);

    if (items !== undefined) {
      const existingIds = existing.items.map((i) => i.id);
      const incomingWithId = items.filter((i) => i.id);
      const incomingNew = items.filter((i) => !i.id);
      const incomingIds = incomingWithId.map((i) => i.id);

      const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

      // Price precedence: the value the user entered on the form, else the item's
      // previously recorded unitPrice (preserved across edits), else 0.
      const toUpdate = incomingWithId.map((i) => {
        const existingItem = existing.items.find(
          (e: (typeof existing.items)[number]) => e.id === i.id,
        );
        const storedUnitPrice = Number(existingItem?.unitPrice ?? 0);
        const unitPrice = i.unitPrice ?? storedUnitPrice;
        const quantity = i.quantity ?? Number(existingItem?.quantity ?? 0);
        return {
          id: i.id,
          batchId: i.batchId,
          grnItemId: i.grnItemId,
          quantity: i.quantity,
          unitPrice,
          totalPrice: quantity * unitPrice,
          reason: i.reason,
        };
      });

      const newBatchIds = incomingNew.map((i) => i.batchId).filter(Boolean) as string[];
      const batchPrices =
        newBatchIds.length > 0 ? await this.repo.findBatchUnitCosts(newBatchIds) : new Map();

      const toCreate = incomingNew.map((i) => {
        if (!i.rawMaterialId || !i.batchId || i.quantity === undefined) {
          throw new BadRequestException(
            "New return items require rawMaterialId, batchId, and quantity",
          );
        }
        const unitPrice =
          i.unitPrice ?? (batchPrices as Map<string, number | null>).get(i.batchId) ?? 0;
        return {
          rawMaterialId: i.rawMaterialId,
          batchId: i.batchId,
          grnItemId: i.grnItemId,
          purchaseItemId: i.purchaseItemId,
          quantity: i.quantity,
          unitPrice,
          totalPrice: i.quantity * unitPrice,
          reason: i.reason,
        };
      });

      diff = { toCreate, toUpdate, toDelete };

      const updatedExisting = existing.items
        .filter((i) => !toDelete.includes(i.id))
        .map((i) => {
          const updated = toUpdate.find((u) => u.id === i.id);
          return { totalPrice: updated?.totalPrice ?? Number(i.totalPrice) };
        });

      const newTotals = toCreate.map((i) => ({ totalPrice: i.totalPrice }));
      totalAmount = [...updatedExisting, ...newTotals].reduce((sum, i) => sum + i.totalPrice, 0);
    }

    return this.repo.update(
      returnId,
      {
        ...rest,
        returnDate: returnDate ? new Date(returnDate) : undefined,
        totalAmount,
        updatedById: userId,
      },
      diff,
      approverIds === undefined ? undefined : [...new Set(approverIds)],
    );
  }

  async updateStatus(returnId: string, dto: UpdateReturnStatusDto, req: RequestWithUser) {
    const { id: userId } = req.user;
    const existing = await this.findOne(returnId);

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.returnNumber);

    switch (dto.status) {
      /** ------------------------ APPROVED ------------------------ */

      case ReturnStatus.APPROVED:
        if (existing.status !== ReturnStatus.DRAFT) {
          throw new BadRequestException("Only DRAFT returns can be approved");
        }

        if (!existing.items.length) {
          throw new BadRequestException("Cannot approve a return with no items");
        }

        if (existing.approvals.length) {
          throw new BadRequestException("This return requires approval — use the approve endpoint");
        }

        return this.repo.updateStatus(returnId, ReturnStatus.APPROVED, {
          approvedById: userId,
          approvedAt: new Date(),
          updatedById: userId,
        });

      /** ------------------------ REJECTED ------------------------ */

      case ReturnStatus.REJECTED:
        if (existing.status !== ReturnStatus.DRAFT) {
          throw new BadRequestException("Only DRAFT returns can be rejected");
        }

        if (!dto.reason) {
          throw new BadRequestException("A reason is required when rejecting a return");
        }

        if (existing.approvals.length) {
          throw new BadRequestException("This return requires approval — use the approve endpoint");
        }

        return this.repo.updateStatus(returnId, ReturnStatus.REJECTED, {
          rejectedById: userId,
          rejectedReason: dto.reason,
          updatedById: userId,
        });

      /** ------------------------ COMPLETED ------------------------ */

      case ReturnStatus.COMPLETED:
        if (existing.status !== ReturnStatus.APPROVED) {
          throw new BadRequestException("Only APPROVED returns can be completed");
        }

        return this.repo.updateStatus(returnId, ReturnStatus.COMPLETED, {
          completedAt: new Date(),
          updatedById: userId,
        });

      /** ------------------------ CANCELLED ------------------------ */

      case ReturnStatus.CANCELLED:
        if (existing.status !== ReturnStatus.DRAFT) {
          throw new BadRequestException("Only DRAFT returns can be cancelled");
        }

        return this.repo.updateStatus(returnId, ReturnStatus.CANCELLED, { updatedById: userId });

      /** ------------------------ Default ------------------------ */

      default:
        throw new BadRequestException(`Invalid target status: ${dto.status}`);
    }
  }

  async approve(returnId: string, dto: DecideReturnApprovalDto, req: RequestWithUser) {
    const { id: userId } = req.user;
    const existing = await this.findOne(returnId);

    const { remarks, decision } = dto;

    if (existing.status !== ReturnStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot record an approval decision for a ${existing.status} return`,
      );
    }

    if (!existing.approvals.length) {
      throw new BadRequestException("This purchase return does not require approval");
    }

    const approval = existing.approvals.find(
      (a: { approverId: string }) => a.approverId === userId,
    );

    if (!approval) {
      throw new ForbiddenException("You are not an approver for this purchase return");
    }

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.returnNumber);

    return this.repo.decideApproval(returnId, userId, decision, remarks);
  }

  async remove(returnId: string, _req: RequestWithUser) {
    const existing = await this.findOne(returnId);

    if (existing.status !== ReturnStatus.DRAFT) {
      throw new BadRequestException("Only DRAFT returns can be deleted");
    }

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.returnNumber);

    await this.repo.delete(returnId);

    return { message: "Purchase return deleted successfully" };
  }
}
