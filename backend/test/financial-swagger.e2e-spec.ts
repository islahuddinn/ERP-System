import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "../src/app.module";

describe("Financial Swagger API Coverage", () => {
  let app: INestApplication;
  let document: Record<string, any>;

  const hasOperation = (
    paths: Record<string, any>,
    candidates: string[],
    method: string,
  ) =>
    candidates.some((path) => paths[path]?.[method] || paths[`/api${path}`]?.[method]);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const config = new DocumentBuilder()
      .setTitle("Factory Distribution System API")
      .setDescription("API documentation")
      .setVersion("1.0")
      .addBearerAuth()
      .build();

    document = SwaggerModule.createDocument(app, config) as Record<string, any>;
  });

  afterAll(async () => {
    await app.close();
  });

  it("exposes AP endpoints including CRUD + aging", () => {
    const paths = (document.paths ?? {}) as Record<string, any>;
    expect(
      hasOperation(paths, ["/financial/ap/bills", "/ap/bills"], "post"),
    ).toBe(true);
    expect(
      hasOperation(paths, ["/financial/ap/bills", "/ap/bills"], "get"),
    ).toBe(true);
    expect(
      hasOperation(paths, ["/financial/ap/bills/{id}", "/ap/bills/{id}"], "get"),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/ap/bills/{id}", "/ap/bills/{id}"],
        "patch",
      ),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/ap/bills/{id}", "/ap/bills/{id}"],
        "delete",
      ),
    ).toBe(true);

    expect(
      hasOperation(paths, ["/financial/ap/payments", "/ap/payments"], "post"),
    ).toBe(true);
    expect(
      hasOperation(paths, ["/financial/ap/payments", "/ap/payments"], "get"),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/ap/payments/{id}", "/ap/payments/{id}"],
        "get",
      ),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/ap/payments/{id}", "/ap/payments/{id}"],
        "patch",
      ),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/ap/payments/{id}", "/ap/payments/{id}"],
        "delete",
      ),
    ).toBe(true);

    expect(hasOperation(paths, ["/financial/ap/aging", "/ap/aging"], "get")).toBe(
      true,
    );
  });

  it("exposes AR endpoints including CRUD + aging", () => {
    const paths = (document.paths ?? {}) as Record<string, any>;
    expect(
      hasOperation(paths, ["/financial/ar/invoices", "/ar/invoices"], "post"),
    ).toBe(true);
    expect(
      hasOperation(paths, ["/financial/ar/invoices", "/ar/invoices"], "get"),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/ar/invoices/{id}", "/ar/invoices/{id}"],
        "get",
      ),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/ar/invoices/{id}", "/ar/invoices/{id}"],
        "patch",
      ),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/ar/invoices/{id}", "/ar/invoices/{id}"],
        "delete",
      ),
    ).toBe(true);

    expect(
      hasOperation(paths, ["/financial/ar/payments", "/ar/payments"], "post"),
    ).toBe(true);
    expect(
      hasOperation(paths, ["/financial/ar/payments", "/ar/payments"], "get"),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/ar/payments/{id}", "/ar/payments/{id}"],
        "get",
      ),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/ar/payments/{id}", "/ar/payments/{id}"],
        "patch",
      ),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/ar/payments/{id}", "/ar/payments/{id}"],
        "delete",
      ),
    ).toBe(true);

    expect(hasOperation(paths, ["/financial/ar/aging", "/ar/aging"], "get")).toBe(
      true,
    );
  });

  it("exposes Cash, Assets, Budgeting, and Reports endpoints", () => {
    const paths = (document.paths ?? {}) as Record<string, any>;
    // Cash
    expect(
      hasOperation(paths, ["/financial/cash/accounts", "/cash/accounts"], "post"),
    ).toBe(true);
    expect(
      hasOperation(paths, ["/financial/cash/accounts", "/cash/accounts"], "get"),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/cash/accounts/{id}", "/cash/accounts/{id}"],
        "get",
      ),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/cash/accounts/{id}", "/cash/accounts/{id}"],
        "patch",
      ),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/cash/accounts/{id}", "/cash/accounts/{id}"],
        "delete",
      ),
    ).toBe(true);

    expect(
      hasOperation(
        paths,
        ["/financial/cash/transactions", "/cash/transactions"],
        "post",
      ),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/cash/transactions", "/cash/transactions"],
        "get",
      ),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        [
          "/financial/cash/transactions/{id}",
          "/cash/transactions/{id}",
        ],
        "get",
      ),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        [
          "/financial/cash/transactions/{id}",
          "/cash/transactions/{id}",
        ],
        "patch",
      ),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        [
          "/financial/cash/transactions/{id}",
          "/cash/transactions/{id}",
        ],
        "delete",
      ),
    ).toBe(true);

    // Assets
    expect(hasOperation(paths, ["/financial/assets", "/assets"], "post")).toBe(
      true,
    );
    expect(hasOperation(paths, ["/financial/assets", "/assets"], "get")).toBe(
      true,
    );
    expect(
      hasOperation(paths, ["/financial/assets/{id}", "/assets/{id}"], "get"),
    ).toBe(true);
    expect(
      hasOperation(paths, ["/financial/assets/{id}", "/assets/{id}"], "patch"),
    ).toBe(true);
    expect(
      hasOperation(paths, ["/financial/assets/{id}", "/assets/{id}"], "delete"),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/assets/depreciation/run", "/assets/depreciation/run"],
        "post",
      ),
    ).toBe(true);

    // Budgeting
    expect(hasOperation(paths, ["/financial/budgets", "/budgets"], "post")).toBe(
      true,
    );
    expect(hasOperation(paths, ["/financial/budgets", "/budgets"], "get")).toBe(
      true,
    );
    expect(
      hasOperation(paths, ["/financial/budgets/{id}", "/budgets/{id}"], "get"),
    ).toBe(true);
    expect(
      hasOperation(paths, ["/financial/budgets/{id}", "/budgets/{id}"], "patch"),
    ).toBe(true);
    expect(
      hasOperation(paths, ["/financial/budgets/{id}", "/budgets/{id}"], "delete"),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/budgets/variance", "/budgets/variance"],
        "get",
      ),
    ).toBe(true);

    // Reports
    expect(
      hasOperation(
        paths,
        ["/financial/reports/profit-loss", "/reports/profit-loss"],
        "get",
      ),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/reports/balance-sheet", "/reports/balance-sheet"],
        "get",
      ),
    ).toBe(true);
    expect(
      hasOperation(
        paths,
        ["/financial/reports/cash-flow", "/reports/cash-flow"],
        "get",
      ),
    ).toBe(true);
  });
});
