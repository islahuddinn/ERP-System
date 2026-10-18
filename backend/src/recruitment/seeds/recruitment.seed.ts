import { PrismaClient } from "@prisma/tenant-client";
import {
  JobRequisitionStatus,
  EmploymentType,
  ApplicationStage,
  OfferStatus,
} from "../dto/recruitment.enums";

export async function seedRecruitmentData(prisma: PrismaClient, tenantId: string) {
  console.log("Seeding recruitment data for tenant:", tenantId);

  // 1. Get some required references
  const department = await (prisma as any).department.findFirst({ where: { tenantId } });
  const position = await (prisma as any).position.findFirst({ where: { tenantId } });
  const user = await (prisma as any).user.findFirst({ where: { tenantId } });

  if (!department || !position || !user) {
    console.log("Skipping recruitment seed: missing department, position, or user");
    return;
  }

  // 2. Create Job Requisition
  const requisition = await (prisma as any).jobRequisition.create({
    data: {
      tenantId,
      title: "Senior Frontend Developer",
      departmentId: department.id,
      positionId: position.id,
      employmentType: EmploymentType.FULL_TIME,
      openings: 2,
      status: JobRequisitionStatus.OPEN,
      description: "Looking for an experienced React developer.",
      createdById: user.id,
    },
  });

  // 3. Create Candidate
  const candidate = await (prisma as any).candidate.create({
    data: {
      tenantId,
      firstName: "Alice",
      lastName: "Smith",
      email: "alice.smith@example.com",
      phone: "+1234567890",
      source: "LinkedIn",
      createdById: user.id,
    },
  });

  // 4. Create Application
  const application = await (prisma as any).application.create({
    data: {
      tenantId,
      candidateId: candidate.id,
      requisitionId: requisition.id,
      stage: ApplicationStage.APPLIED,
      createdById: user.id,
    },
  });

  console.log("Recruitment data seeded successfully");
}
