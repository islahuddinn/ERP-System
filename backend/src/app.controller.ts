import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AppService } from "./app.service";

@ApiTags("App")
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: "Get app info" })
  getHello(): string {
    return "Inventory Management API is live";
  }

  @Get("health")
  @ApiOperation({ summary: "Health check" })
  getHealth() {
    return {
      status: "ok",
      ready: true,
      timestamp: new Date().toISOString(),
    };
  }
}
