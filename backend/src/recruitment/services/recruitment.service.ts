import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";
import { MultiTenantPrismaService } from "../../prisma/multi-tenant-prisma.service";
import { ApplicationStage, OfferStatus } from "../dto/recruitment.enums";
import { JobRequisitionRepository } from "../repositories/job-requisition.repository";
import { CandidateRepository } from "../repositories/candidate.repository";
import { ApplicationRepository } from "../repositories/application.repository";
import { InterviewRepository } from "../repositories/interview.repository";
import { OfferRepository } from "../repositories/offer.repository";

interface TenantRequestUser {
  id: string;
  tenantId: string;
}

@Injectable()
export class RecruitmentService {
  constructor(
    private readonly prismaService: MultiTenantPrismaService,
    private readonly jobRequisitionRepo: JobRequisitionRepository,
    private readonly candidateRepo: CandidateRepository,
    private readonly applicationRepo: ApplicationRepository,
    private readonly interviewRepo: InterviewRepository,
    private readonly offerRepo: OfferRepository,
  ) {}

  private async getTenantClient(tenantId: string): Promise<any> {
    return (await this.prismaService.getTenantClient(tenantId)) as any;
  }

  // Job Requisition Methods
  async createJobRequisition(tenant: TenantRequestUser, data: any) {
    const prisma = await this.getTenantClient(tenant.tenantId);
    return this.jobRequisitionRepo.create(prisma, {
      ...data,
      tenantId: tenant.tenantId,
      createdById: tenant.id,
    });
  }

  async listJobRequisitions(tenantId: string, filters: any) {
    const prisma = await this.getTenantClient(tenantId);
    return this.jobRequisitionRepo.list(prisma, tenantId, filters);
  }

  async getJobRequisition(tenantId: string, id: string) {
    const prisma = await this.getTenantClient(tenantId);
    const requisition = await this.jobRequisitionRepo.findById(prisma, id);
    if (!requisition || requisition.tenantId !== tenantId) {
      throw new NotFoundException("Job requisition not found");
    }
    return requisition;
  }

  async updateJobRequisition(tenant: TenantRequestUser, id: string, data: any) {
    const prisma = await this.getTenantClient(tenant.tenantId);
    const requisition = await this.jobRequisitionRepo.findById(prisma, id);
    if (!requisition || requisition.tenantId !== tenant.tenantId) {
      throw new NotFoundException("Job requisition not found");
    }
    return this.jobRequisitionRepo.update(prisma, id, data);
  }

  async deleteJobRequisition(tenant: TenantRequestUser, id: string) {
    const prisma = await this.getTenantClient(tenant.tenantId);
    const requisition = await this.jobRequisitionRepo.findById(prisma, id);
    if (!requisition || requisition.tenantId !== tenant.tenantId) {
      throw new NotFoundException("Job requisition not found");
    }
    return this.jobRequisitionRepo.delete(prisma, id);
  }

  // Candidate Methods
  async createCandidate(tenant: TenantRequestUser, data: any) {
    const prisma = await this.getTenantClient(tenant.tenantId);

    // Check if candidate with same email already exists
    const existingCandidate = await this.candidateRepo.findByEmail(
      prisma,
      tenant.tenantId,
      data.email,
    );
    if (existingCandidate) {
      throw new BadRequestException("Candidate with this email already exists");
    }

    return this.candidateRepo.create(prisma, {
      ...data,
      tenantId: tenant.tenantId,
      createdById: tenant.id,
    });
  }

  async listCandidates(tenantId: string, filters: any) {
    const prisma = await this.getTenantClient(tenantId);
    return this.candidateRepo.list(prisma, tenantId, filters);
  }

  async getCandidate(tenantId: string, id: string) {
    const prisma = await this.getTenantClient(tenantId);
    const candidate = await this.candidateRepo.findById(prisma, id);
    if (!candidate || candidate.tenantId !== tenantId) {
      throw new NotFoundException("Candidate not found");
    }
    return candidate;
  }

  async updateCandidate(tenant: TenantRequestUser, id: string, data: any) {
    const prisma = await this.getTenantClient(tenant.tenantId);
    const candidate = await this.candidateRepo.findById(prisma, id);
    if (!candidate || candidate.tenantId !== tenant.tenantId) {
      throw new NotFoundException("Candidate not found");
    }

    // Check if email is being updated and if it conflicts with existing candidate
    if (data.email && data.email !== candidate.email) {
      const existingCandidate = await this.candidateRepo.findByEmail(
        prisma,
        tenant.tenantId,
        data.email,
      );
      if (existingCandidate) {
        throw new BadRequestException("Candidate with this email already exists");
      }
    }

    return this.candidateRepo.update(prisma, id, data);
  }

  async deleteCandidate(tenant: TenantRequestUser, id: string) {
    const prisma = await this.getTenantClient(tenant.tenantId);
    const candidate = await this.candidateRepo.findById(prisma, id);
    if (!candidate || candidate.tenantId !== tenant.tenantId) {
      throw new NotFoundException("Candidate not found");
    }
    return this.candidateRepo.delete(prisma, id);
  }

  // Application Methods
  async createApplication(tenant: TenantRequestUser, data: any) {
    const prisma = await this.getTenantClient(tenant.tenantId);

    // Check if application already exists for this candidate and requisition
    const existingApplication = await this.applicationRepo.findByCandidateAndRequisition(
      prisma,
      data.candidateId,
      data.requisitionId,
    );
    if (existingApplication) {
      throw new BadRequestException(
        "Application already exists for this candidate and job requisition",
      );
    }

    return this.applicationRepo.create(prisma, {
      ...data,
      tenantId: tenant.tenantId,
      stage: ApplicationStage.APPLIED,
      createdById: tenant.id,
    });
  }

  async listApplications(tenantId: string, filters: any) {
    const prisma = await this.getTenantClient(tenantId);
    return this.applicationRepo.list(prisma, tenantId, filters);
  }

  async getApplication(tenantId: string, id: string) {
    const prisma = await this.getTenantClient(tenantId);
    const application = await this.applicationRepo.findById(prisma, id);
    if (!application || application.tenantId !== tenantId) {
      throw new NotFoundException("Application not found");
    }
    return application;
  }

  async updateApplication(tenant: TenantRequestUser, id: string, data: any) {
    const prisma = await this.getTenantClient(tenant.tenantId);
    const application = await this.applicationRepo.findById(prisma, id);
    if (!application || application.tenantId !== tenant.tenantId) {
      throw new NotFoundException("Application not found");
    }
    return this.applicationRepo.update(prisma, id, data);
  }

  async updateApplicationStage(
    tenant: TenantRequestUser,
    id: string,
    stage: ApplicationStage,
    notes?: string,
  ) {
    const prisma = await this.getTenantClient(tenant.tenantId);
    const application = await this.applicationRepo.findById(prisma, id);
    if (!application || application.tenantId !== tenant.tenantId) {
      throw new NotFoundException("Application not found");
    }

    // Validate stage transitions
    this.validateStageTransition(application.stage, stage);

    return this.applicationRepo.updateStage(prisma, id, stage, notes);
  }

  private validateStageTransition(currentStage: ApplicationStage, newStage: ApplicationStage) {
    const stageOrder = [
      ApplicationStage.APPLIED,
      ApplicationStage.SCREENING,
      ApplicationStage.INTERVIEW,
      ApplicationStage.OFFERED,
      ApplicationStage.HIRED,
    ];

    const currentIndex = stageOrder.indexOf(currentStage);
    const newIndex = stageOrder.indexOf(newStage);

    // Allow moving to REJECTED at any stage
    if (newStage === ApplicationStage.REJECTED) {
      return;
    }

    // Cannot skip stages (except for REJECTED)
    if (newIndex > currentIndex + 1) {
      throw new BadRequestException(`Cannot skip from ${currentStage} to ${newStage}`);
    }

    // Cannot move backwards (except for REJECTED)
    if (newIndex < currentIndex) {
      throw new BadRequestException(`Cannot move backwards from ${currentStage} to ${newStage}`);
    }
  }

  async deleteApplication(tenant: TenantRequestUser, id: string) {
    const prisma = await this.getTenantClient(tenant.tenantId);
    const application = await this.applicationRepo.findById(prisma, id);
    if (!application || application.tenantId !== tenant.tenantId) {
      throw new NotFoundException("Application not found");
    }
    return this.applicationRepo.delete(prisma, id);
  }

  // Interview Methods
  async createInterview(tenant: TenantRequestUser, data: any) {
    const prisma = await this.getTenantClient(tenant.tenantId);

    // Check for duplicate interviews at the same time
    const existingInterview = await this.interviewRepo.findByInterviewerAndTime(
      prisma,
      data.interviewerId,
      data.interviewDate,
    );
    if (existingInterview) {
      throw new BadRequestException("Interviewer already has an interview scheduled at this time");
    }

    // Validate that application exists and is in INTERVIEW stage
    const application = await this.applicationRepo.findById(prisma, data.applicationId);
    if (!application || application.tenantId !== tenant.tenantId) {
      throw new NotFoundException("Application not found");
    }
    if (application.stage !== ApplicationStage.INTERVIEW) {
      throw new BadRequestException(
        "Application must be in INTERVIEW stage to schedule interviews",
      );
    }

    return this.interviewRepo.create(prisma, {
      ...data,
      tenantId: tenant.tenantId,
      createdById: tenant.id,
    });
  }

  async listInterviews(tenantId: string, filters: any) {
    const prisma = await this.getTenantClient(tenantId);
    return this.interviewRepo.list(prisma, tenantId, filters);
  }

  async getInterview(tenantId: string, id: string) {
    const prisma = await this.getTenantClient(tenantId);
    const interview = await this.interviewRepo.findById(prisma, id);
    if (!interview || interview.tenantId !== tenantId) {
      throw new NotFoundException("Interview not found");
    }
    return interview;
  }

  async updateInterview(tenant: TenantRequestUser, id: string, data: any) {
    const prisma = await this.getTenantClient(tenant.tenantId);
    const interview = await this.interviewRepo.findById(prisma, id);
    if (!interview || interview.tenantId !== tenant.tenantId) {
      throw new NotFoundException("Interview not found");
    }
    return this.interviewRepo.update(prisma, id, data);
  }

  async deleteInterview(tenant: TenantRequestUser, id: string) {
    const prisma = await this.getTenantClient(tenant.tenantId);
    const interview = await this.interviewRepo.findById(prisma, id);
    if (!interview || interview.tenantId !== tenant.tenantId) {
      throw new NotFoundException("Interview not found");
    }
    return this.interviewRepo.delete(prisma, id);
  }

  // Offer Methods
  async createOffer(tenant: TenantRequestUser, data: any) {
    const prisma = await this.getTenantClient(tenant.tenantId);

    // Validate that application exists and is in INTERVIEW stage
    const application = await this.applicationRepo.findById(prisma, data.applicationId);
    if (!application || application.tenantId !== tenant.tenantId) {
      throw new NotFoundException("Application not found");
    }
    if (application.stage !== ApplicationStage.INTERVIEW) {
      throw new BadRequestException(
        "Offer can only be created for applications in INTERVIEW stage",
      );
    }

    const offer = await this.offerRepo.create(prisma, {
      ...data,
      tenantId: tenant.tenantId,
      status: OfferStatus.PENDING,
      createdById: tenant.id,
    });

    // Update application stage to OFFERED
    await this.applicationRepo.updateStage(prisma, data.applicationId, ApplicationStage.OFFERED);

    return offer;
  }

  async listOffers(tenantId: string, filters: any) {
    const prisma = await this.getTenantClient(tenantId);
    return this.offerRepo.list(prisma, tenantId, filters);
  }

  async getOffer(tenantId: string, id: string) {
    const prisma = await this.getTenantClient(tenantId);
    const offer = await this.offerRepo.findById(prisma, id);
    if (!offer || offer.tenantId !== tenantId) {
      throw new NotFoundException("Offer not found");
    }
    return offer;
  }

  async updateOffer(tenant: TenantRequestUser, id: string, data: any) {
    const prisma = await this.getTenantClient(tenant.tenantId);
    const offer = await this.offerRepo.findById(prisma, id);
    if (!offer || offer.tenantId !== tenant.tenantId) {
      throw new NotFoundException("Offer not found");
    }

    const updatedOffer = await this.offerRepo.update(prisma, id, data);

    // If offer is accepted, update application stage to HIRED
    if (data.status === OfferStatus.ACCEPTED) {
      await this.applicationRepo.updateStage(prisma, offer.applicationId, ApplicationStage.HIRED);

      // Trigger onboarding process
      await this.processOnboarding(prisma, offer.applicationId);
    }

    return updatedOffer;
  }

  async deleteOffer(tenant: TenantRequestUser, id: string) {
    const prisma = await this.getTenantClient(tenant.tenantId);
    const offer = await this.offerRepo.findById(prisma, id);
    if (!offer || offer.tenantId !== tenant.tenantId) {
      throw new NotFoundException("Offer not found");
    }
    return this.offerRepo.delete(prisma, id);
  }

  // Onboarding Process
  private async processOnboarding(prisma: PrismaClient, applicationId: string) {
    const application = await this.applicationRepo.findById(prisma, applicationId);
    if (!application || !application.candidate) {
      throw new NotFoundException("Application or candidate not found");
    }

    // Create employee record (basic info now lives on User — link userId when User is created)
    const employee = await prisma.employee.create({
      data: {
        employeeCode: `EMP${Date.now()}`,
        status: "ACTIVE",
        dateOfJoining: new Date(),
        createdById: application.createdById,
      },
    });

    // TODO: Optionally create user account if needed
    // This would integrate with the auth module

    return employee;
  }

  // Dashboard Statistics
  async getRecruitmentStats(tenantId: string) {
    const prisma = await this.getTenantClient(tenantId);

    const [
      totalRequisitions,
      openRequisitions,
      totalCandidates,
      totalApplications,
      applicationsByStage,
      upcomingInterviews,
      pendingOffers,
    ] = await Promise.all([
      prisma.jobRequisition.count({ where: { tenantId } }),
      prisma.jobRequisition.count({ where: { tenantId, status: "OPEN" } }),
      prisma.candidate.count({ where: { tenantId } }),
      prisma.application.count({ where: { tenantId } }),
      prisma.application.groupBy({
        by: ["stage"],
        where: { tenantId },
        _count: true,
      }),
      prisma.interview.count({
        where: {
          tenantId,
          interviewDate: { gte: new Date() },
        },
      }),
      prisma.offer.count({
        where: { tenantId, status: "PENDING" },
      }),
    ]);

    return {
      totalRequisitions,
      openRequisitions,
      totalCandidates,
      totalApplications,
      applicationsByStage: applicationsByStage.reduce((acc, item) => {
        acc[item.stage] = item._count;
        return acc;
      }, {}),
      upcomingInterviews,
      pendingOffers,
    };
  }
}
