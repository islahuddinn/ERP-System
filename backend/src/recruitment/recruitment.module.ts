import { Module } from "@nestjs/common";
import { MultiTenantPrismaModule } from "../prisma/multi-tenant-prisma.module";
import { CommonServicesModule } from "../common/services/common-services.module";
import { UsersModule } from "../users/users.module";
import { JobRequisitionController } from "./controllers/job-requisition.controller";
import { CandidateController } from "./controllers/candidate.controller";
import { ApplicationController } from "./controllers/application.controller";
import { InterviewController } from "./controllers/interview.controller";
import { OfferController } from "./controllers/offer.controller";
import { RecruitmentDashboardController } from "./controllers/recruitment-dashboard.controller";
import { RecruitmentService } from "./services/recruitment.service";
import { JobRequisitionRepository } from "./repositories/job-requisition.repository";
import { CandidateRepository } from "./repositories/candidate.repository";
import { ApplicationRepository } from "./repositories/application.repository";
import { InterviewRepository } from "./repositories/interview.repository";
import { OfferRepository } from "./repositories/offer.repository";

@Module({
  imports: [
    MultiTenantPrismaModule,
    CommonServicesModule,
    UsersModule,
  ],
  controllers: [
    RecruitmentDashboardController,
    JobRequisitionController,
    CandidateController,
    ApplicationController,
    InterviewController,
    OfferController,
  ],
  providers: [
    RecruitmentService,
    JobRequisitionRepository,
    CandidateRepository,
    ApplicationRepository,
    InterviewRepository,
    OfferRepository,
  ],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
