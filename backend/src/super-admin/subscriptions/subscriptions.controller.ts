import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { SuperAdminJwtAuthGuard } from "../auth/guards/super-admin-jwt-auth.guard";
import { SubscriptionsService } from "./subscriptions.service";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import { SubscriptionsQueryDto } from "./dto/find-subscriptions-query.dto";
import { UpdateSubscriptionStatusDto } from "./dto/update-subscription-status.dto";

@ApiTags(`Super Admin - Subscriptions`)
@Controller(`super-admin/subscriptions`)
@UseGuards(SuperAdminJwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(createSubscriptionDto);
  }

  @Get()
  findAll(@Query() query: SubscriptionsQueryDto) {
    return this.subscriptionsService.findAll(query);
  }

  @Get(`:subscriptionId`)
  findOne(@Param(`subscriptionId`) subscriptionId: string) {
    return this.subscriptionsService.findOne(subscriptionId);
  }

  @Patch(`:subscriptionId`)
  update(
    @Param(`subscriptionId`) subscriptionId: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.update(subscriptionId, updateSubscriptionDto);
  }

  @Delete(`:subscriptionId`)
  remove(@Param(`subscriptionId`) subscriptionId: string) {
    return this.subscriptionsService.remove(subscriptionId);
  }

  @Patch(`:subscriptionId/status`)
  updateStatus(
    @Param(`subscriptionId`) subscriptionId: string,
    @Body() dto: UpdateSubscriptionStatusDto,
  ) {
    return this.subscriptionsService.updateStatus(subscriptionId, dto);
  }
}
