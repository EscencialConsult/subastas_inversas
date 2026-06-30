using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Auctions;
using SICST.Application.Auctions.Commands;
using SICST.Application.Auctions.DTOs;
using SICST.Application.Common.Interfaces;
using SICST.Application.Common.Interfaces;
using SICST.Application.Purchases.Commands;
using SICST.Application.Purchases.DTOs;
using SICST.Application.Purchases.Queries;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;
using Xunit;

namespace SICST.Tests.Purchases;

public class PurchaseProcessHandlerTests
{
    private ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var context = new ApplicationDbContext(options, new SICST.Tests.TestCurrentTenant());
        context.Database.EnsureCreated();
        return context;
    }

    [Fact]
    public async Task CreatePurchaseProcess_ShouldPersistDraftWithItems()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var handler = new CreatePurchaseProcessCommandHandler(context);

        var result = await handler.Handle(new CreatePurchaseProcessCommand
        {
            CompanyId = companyId,
            BuyerId = buyerId,
            Title = "Compra de insumos",
            Description = "Insumos de limpieza",
            EstimatedBudget = 500000,
            Items =
            [
                new PurchaseItemInputDto
                {
                    Description = "Detergente",
                    Quantity = 100,
                    Unit = "unidad",
                    EstimatedUnitPrice = 1200
                }
            ]
        }, CancellationToken.None);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("PC-0001", result.Code);
        Assert.Equal(PurchaseProcessStatus.Draft, result.Status);
        Assert.Single(result.Items);
    }

    [Fact]
    public async Task CreatePurchaseProcess_ShouldAssignSuggestedContractingModeByBudget()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var directMode = new ContractingMode
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Name = "Compra directa",
            MinAmount = 0,
            MaxAmount = 100000,
            Active = true
        };
        var auctionMode = new ContractingMode
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Name = "Subasta inversa",
            MinAmount = 100000.01m,
            MaxAmount = null,
            Active = true
        };
        context.ContractingModes.AddRange(directMode, auctionMode);
        await context.SaveChangesAsync();

        var result = await new CreatePurchaseProcessCommandHandler(context)
            .Handle(new CreatePurchaseProcessCommand
            {
                CompanyId = companyId,
                BuyerId = buyerId,
                Title = "Compra de equipamiento",
                EstimatedBudget = 250000
            }, CancellationToken.None);

        Assert.Equal(auctionMode.Id, result.ContractingModeId);
    }

    [Fact]
    public async Task PublishPurchaseProcess_ShouldMoveDraftToPublished()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var created = await new CreatePurchaseProcessCommandHandler(context)
            .Handle(new CreatePurchaseProcessCommand
            {
                CompanyId = companyId,
                BuyerId = buyerId,
                Title = "Compra de notebooks",
                EstimatedBudget = 2000000
            }, CancellationToken.None);

        var published = await new PublishPurchaseProcessCommandHandler(context)
            .Handle(new PublishPurchaseProcessCommand(companyId, created.Id), CancellationToken.None);

        Assert.NotNull(published);
        Assert.Equal(PurchaseProcessStatus.Approved, published.Status);
        Assert.NotNull(published.PublishedAtUtc);
    }

    [Fact]
    public async Task PublishPurchaseProcess_ShouldCalculateSpecificationsHashAndLogAudit()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        
        // 1. Create a process with items
        var created = await new CreatePurchaseProcessCommandHandler(context)
            .Handle(new CreatePurchaseProcessCommand
            {
                CompanyId = companyId,
                BuyerId = buyerId,
                Title = "Compra de servidores",
                Description = "Servidores rack 2U",
                EstimatedBudget = 5000000,
                Items =
                [
                    new PurchaseItemInputDto
                    {
                        Description = "Notebook Developer Pro",
                        Quantity = 10,
                        Unit = "Unidades",
                        EstimatedUnitPrice = 500000
                    }
                ]
            }, CancellationToken.None);

        // 2. Publish the process
        var published = await new PublishPurchaseProcessCommandHandler(context)
            .Handle(new PublishPurchaseProcessCommand(companyId, created!.Id), CancellationToken.None);

        // Assert hash is calculated and mapped to DTO
        Assert.NotNull(published);
        Assert.NotNull(published.SpecificationsHash);
        Assert.Equal(64, published.SpecificationsHash.Length);

        // Calculate expected hash to compare
        var specLines = new List<string>
        {
            "Compra de servidores",
            "Servidores rack 2U",
            (5000000m).ToString("G", System.Globalization.CultureInfo.InvariantCulture)
        };
        specLines.Add("Notebook Developer Pro");
        specLines.Add((10m).ToString("G", System.Globalization.CultureInfo.InvariantCulture));
        specLines.Add("Unidades");
        specLines.Add((500000m).ToString("G", System.Globalization.CultureInfo.InvariantCulture));

        var material = string.Join("|", specLines);
        var expectedBytes = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(material));
        var expectedHash = Convert.ToHexString(expectedBytes).ToLowerInvariant();

        Assert.Equal(expectedHash, published.SpecificationsHash);

        // 3. Verify audit event is recorded in the DbContext
        var auditEvent = await context.AuditEvents
            .FirstOrDefaultAsync(e => e.EntityName == "PurchaseProcess" && e.EntityId == created.Id.ToString() && e.Action == AuditEventAction.Updated);
        
        Assert.NotNull(auditEvent);
        Assert.Contains(published.SpecificationsHash, auditEvent.Payload);
    }

    [Fact]
    public async Task ApprovalWorkflow_ShouldRouteApprovalsByOrderedLevelsAndRole()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var adminId = await SeedUser(context, companyId, UserRole.Admin, "admin");
        var authorityId = await SeedUser(context, companyId, UserRole.Autoridad, "autoridad");

        context.ApprovalWorkflows.Add(new ApprovalWorkflow
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Name = "Circuito alto monto",
            MinAmount = 0,
            MaxAmount = null,
            RequiredRole = UserRole.Admin,
            RequiredApprovals = 2,
            Active = true,
            CreatedAtUtc = DateTime.UtcNow,
            Levels =
            [
                new ApprovalWorkflowLevel
                {
                    Id = Guid.NewGuid(),
                    LevelOrder = 1,
                    RequiredRole = UserRole.Admin,
                    AmountThreshold = 0,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new ApprovalWorkflowLevel
                {
                    Id = Guid.NewGuid(),
                    LevelOrder = 2,
                    RequiredRole = UserRole.Autoridad,
                    AmountThreshold = 1_000_000,
                    CreatedAtUtc = DateTime.UtcNow
                }
            ]
        });
        await context.SaveChangesAsync();

        var created = await new CreatePurchaseProcessCommandHandler(context)
            .Handle(new CreatePurchaseProcessCommand
            {
                CompanyId = companyId,
                BuyerId = buyerId,
                Title = "Compra de maquinaria",
                EstimatedBudget = 2_000_000
            }, CancellationToken.None);

        var published = await new PublishPurchaseProcessCommandHandler(context)
            .Handle(new PublishPurchaseProcessCommand(companyId, created.Id), CancellationToken.None);

        Assert.NotNull(published);
        Assert.Equal(PurchaseProcessStatus.PendingApproval, published.Status);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new ApprovePurchaseProcessCommandHandler(context)
                .Handle(new ApprovePurchaseProcessCommand(companyId, created.Id, authorityId), CancellationToken.None));

        var firstApproval = await new ApprovePurchaseProcessCommandHandler(context)
            .Handle(new ApprovePurchaseProcessCommand(companyId, created.Id, adminId), CancellationToken.None);

        Assert.NotNull(firstApproval);
        Assert.Equal(PurchaseProcessStatus.PendingApproval, firstApproval.Status);

        var finalApproval = await new ApprovePurchaseProcessCommandHandler(context)
            .Handle(new ApprovePurchaseProcessCommand(companyId, created.Id, authorityId), CancellationToken.None);

        Assert.NotNull(finalApproval);
        Assert.Equal(PurchaseProcessStatus.Approved, finalApproval.Status);
        Assert.Equal(2, await context.Approvals.CountAsync(a => a.PurchaseProcessId == created.Id));
    }

    [Fact]
    public async Task AdjudicationApproval_ShouldActivateLevelsByAwardAmount()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var adminId = await SeedUser(context, companyId, UserRole.Admin, "admin-adj");
        var authorityId = await SeedUser(context, companyId, UserRole.Autoridad, "autoridad-adj");
        var supplierId = await SeedSupplier(context);

        context.ApprovalWorkflows.Add(new ApprovalWorkflow
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Name = "Circuito adjudicacion alto monto",
            MinAmount = 0,
            MaxAmount = null,
            RequiredRole = UserRole.Admin,
            RequiredApprovals = 2,
            Active = true,
            CreatedAtUtc = DateTime.UtcNow,
            Levels =
            [
                new ApprovalWorkflowLevel
                {
                    Id = Guid.NewGuid(),
                    LevelOrder = 1,
                    RequiredRole = UserRole.Admin,
                    AmountThreshold = 0,
                    CreatedAtUtc = DateTime.UtcNow
                },
                new ApprovalWorkflowLevel
                {
                    Id = Guid.NewGuid(),
                    LevelOrder = 2,
                    RequiredRole = UserRole.Autoridad,
                    AmountThreshold = 100_000,
                    CreatedAtUtc = DateTime.UtcNow
                }
            ]
        });

        var process = new PurchaseProcess
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            BuyerId = buyerId,
            Code = "PC-ADJ-LEVELS",
            Title = "Adjudicacion con niveles",
            EstimatedBudget = 300_000,
            Status = PurchaseProcessStatus.Adjudicated,
            CreatedAtUtc = DateTime.UtcNow
        };
        context.PurchaseProcesses.Add(process);
        context.Awards.Add(new Award
        {
            Id = Guid.NewGuid(),
            PurchaseProcessId = process.Id,
            SupplierId = supplierId,
            Amount = 150_000,
            AdjudicatedById = buyerId,
            AdjudicatedAtUtc = DateTime.UtcNow,
            Observations = "Adjudicado",
            DocumentPath = "/dummy/path/acta.pdf"
        });
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new ApprovePurchaseProcessCommandHandler(context)
                .Handle(new ApprovePurchaseProcessCommand(companyId, process.Id, authorityId), CancellationToken.None));

        var firstApproval = await new ApprovePurchaseProcessCommandHandler(context)
            .Handle(new ApprovePurchaseProcessCommand(companyId, process.Id, adminId), CancellationToken.None);

        Assert.NotNull(firstApproval);
        Assert.Equal(PurchaseProcessStatus.Adjudicated, firstApproval.Status);

        var finalApproval = await new ApprovePurchaseProcessCommandHandler(context)
            .Handle(new ApprovePurchaseProcessCommand(companyId, process.Id, authorityId), CancellationToken.None);

        Assert.NotNull(finalApproval);
        Assert.Equal(PurchaseProcessStatus.Approved, finalApproval.Status);
        Assert.Equal(2, await context.Approvals.CountAsync(a => a.PurchaseProcessId == process.Id &&
            a.Status == ApprovalStatus.Approved &&
            a.ApprovalWorkflowLevelId.HasValue));
    }

    [Fact]
    public async Task ReturnPurchaseProcess_ShouldMoveAdjudicationBackToEvaluationAndAuditDecision()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var authorityId = await SeedUser(context, companyId, UserRole.Autoridad, "autoridad-return");
        var supplierId = await SeedSupplier(context);

        context.ApprovalWorkflows.Add(new ApprovalWorkflow
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Name = "Circuito adjudicacion",
            MinAmount = 0,
            MaxAmount = null,
            RequiredRole = UserRole.Autoridad,
            RequiredApprovals = 1,
            Active = true,
            CreatedAtUtc = DateTime.UtcNow,
            Levels =
            [
                new ApprovalWorkflowLevel
                {
                    Id = Guid.NewGuid(),
                    LevelOrder = 1,
                    RequiredRole = UserRole.Autoridad,
                    AmountThreshold = 0,
                    CreatedAtUtc = DateTime.UtcNow
                }
            ]
        });

        var process = new PurchaseProcess
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            BuyerId = buyerId,
            Code = "PC-ADJ-RETURN",
            Title = "Adjudicacion devuelta",
            EstimatedBudget = 100_000,
            Status = PurchaseProcessStatus.Adjudicated,
            CreatedAtUtc = DateTime.UtcNow
        };
        context.PurchaseProcesses.Add(process);
        context.Awards.Add(new Award
        {
            Id = Guid.NewGuid(),
            PurchaseProcessId = process.Id,
            SupplierId = supplierId,
            Amount = 90_000,
            AdjudicatedById = buyerId,
            AdjudicatedAtUtc = DateTime.UtcNow,
            Observations = "Adjudicado",
            DocumentPath = "/dummy/path/acta.pdf"
        });
        await context.SaveChangesAsync();

        var returned = await new ReturnPurchaseProcessCommandHandler(context)
            .Handle(new ReturnPurchaseProcessCommand(companyId, process.Id, authorityId, "Revisar cuadro comparativo"), CancellationToken.None);

        Assert.NotNull(returned);
        Assert.Equal(PurchaseProcessStatus.Evaluation, returned.Status);
        Assert.Equal("Revisar cuadro comparativo", returned.RejectionReason);

        var decision = await context.Approvals.SingleAsync(a => a.PurchaseProcessId == process.Id);
        Assert.Equal(ApprovalStatus.Returned, decision.Status);
        Assert.NotNull(decision.ApprovalWorkflowLevelId);
    }

    [Fact]
    public async Task DeclareDeserted_ShouldRequireGroundsAndCloseProcess()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);

        var process = new PurchaseProcess
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            BuyerId = buyerId,
            Code = "PC-DESERT",
            Title = "Proceso sin ofertas aptas",
            EstimatedBudget = 100_000,
            Status = PurchaseProcessStatus.Evaluation,
            CreatedAtUtc = DateTime.UtcNow
        };
        context.PurchaseProcesses.Add(process);
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new DeclarePurchaseProcessDesertedCommandHandler(context)
                .Handle(new DeclarePurchaseProcessDesertedCommand(companyId, process.Id, buyerId, ""), CancellationToken.None));

        var result = await new DeclarePurchaseProcessDesertedCommandHandler(context)
            .Handle(new DeclarePurchaseProcessDesertedCommand(companyId, process.Id, buyerId, "No se recibieron ofertas admisibles"), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(PurchaseProcessStatus.Deserted, result.Status);
        Assert.Equal("No se recibieron ofertas admisibles", result.RejectionReason);
        Assert.NotNull(result.ClosedAtUtc);
    }

    [Fact]
    public async Task SuspendByChallenge_ShouldStoreGroundsAndCloseOpenAuction()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);

        var process = new PurchaseProcess
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            BuyerId = buyerId,
            Code = "PC-IMPUG",
            Title = "Proceso impugnado",
            EstimatedBudget = 150_000,
            Status = PurchaseProcessStatus.InAuction,
            CreatedAtUtc = DateTime.UtcNow
        };
        var auction = new Auction
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            PurchaseProcessId = process.Id,
            BasePrice = 150_000,
            MinimumDecrementPercentage = 1,
            Status = AuctionStatus.Open,
            StartsAtUtc = DateTime.UtcNow.AddMinutes(-10),
            EndsAtUtc = DateTime.UtcNow.AddMinutes(20)
        };
        context.PurchaseProcesses.Add(process);
        context.Auctions.Add(auction);
        await context.SaveChangesAsync();

        var result = await new SuspendPurchaseProcessByChallengeCommandHandler(context)
            .Handle(new SuspendPurchaseProcessByChallengeCommand(companyId, process.Id, buyerId, "Impugnacion recibida contra el pliego"), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(PurchaseProcessStatus.SuspendedByChallenge, result.Status);
        Assert.Equal("Impugnacion recibida contra el pliego", result.RejectionReason);

        var dbAuction = await context.Auctions.FindAsync(auction.Id);
        Assert.NotNull(dbAuction);
        Assert.Equal(AuctionStatus.Closed, dbAuction.Status);
        Assert.NotNull(dbAuction.ClosedAtUtc);
    }

    [Fact]
    public async Task InviteSupplier_ShouldPreventDuplicateInvitation()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var supplierId = await SeedSupplier(context);
        await SeedCompanySupplier(context, companyId, supplierId);
        var process = await new CreatePurchaseProcessCommandHandler(context)
            .Handle(new CreatePurchaseProcessCommand
            {
                CompanyId = companyId,
                BuyerId = buyerId,
                Title = "Compra de mobiliario",
                EstimatedBudget = 750000
            }, CancellationToken.None);

        var handler = new InviteSupplierCommandHandler(context);
        var command = new InviteSupplierCommand
        {
            CompanyId = companyId,
            PurchaseProcessId = process.Id,
            SupplierId = supplierId
        };

        var invitation = await handler.Handle(command, CancellationToken.None);

        Assert.Equal(InvitationStatus.Pending, invitation.Status);
        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task GetPurchaseProcesses_ShouldFilterByCompany()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var (otherCompanyId, otherBuyerId) = await SeedCompanyAndBuyer(context, "otra");
        var handler = new CreatePurchaseProcessCommandHandler(context);

        await handler.Handle(new CreatePurchaseProcessCommand
        {
            CompanyId = companyId,
            BuyerId = buyerId,
            Title = "Proceso propio"
        }, CancellationToken.None);

        await handler.Handle(new CreatePurchaseProcessCommand
        {
            CompanyId = otherCompanyId,
            BuyerId = otherBuyerId,
            Title = "Proceso ajeno"
        }, CancellationToken.None);

        var result = await new GetPurchaseProcessesQueryHandler(context)
            .Handle(new GetPurchaseProcessesQuery(companyId), CancellationToken.None);

        Assert.Single(result.Items);
        Assert.Equal("Proceso propio", result.Items[0].Title);
    }

    private static async Task<(Guid companyId, Guid buyerId)> SeedCompanyAndBuyer(ApplicationDbContext context, string suffix = "test")
    {
        var company = new Company
        {
            Id = Guid.NewGuid(),
            Name = $"Municipio {suffix}",
            Domain = $"municipio-{suffix}-{Guid.NewGuid():N}",
            IsPublicEntity = true
        };

        var buyer = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Email = $"comprador-{Guid.NewGuid():N}@test.com",
            PasswordHash = "hash",
            FirstName = "Comprador",
            LastName = suffix,
            Role = UserRole.Comprador,
            Active = true
        };

        context.Companies.Add(company);
        context.Users.Add(buyer);
        await context.SaveChangesAsync();
        return (company.Id, buyer.Id);
    }

    private static async Task<Guid> SeedUser(ApplicationDbContext context, Guid companyId, UserRole role, string prefix)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Email = $"{prefix}-{Guid.NewGuid():N}@test.com",
            PasswordHash = "hash",
            FirstName = prefix,
            LastName = "Test",
            Role = role,
            Active = true
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.Id;
    }

    private static async Task<Guid> SeedSupplier(ApplicationDbContext context)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = $"proveedor-{Guid.NewGuid():N}@test.com",
            PasswordHash = "hash",
            FirstName = "Proveedor",
            LastName = "",
            Role = UserRole.Proveedor,
            Active = true
        };

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Cuit = $"30-{Random.Shared.Next(10000000, 99999999)}-1",
            BusinessName = "Proveedor Test",
            Email = user.Email,
            BusinessCategory = "Servicios",
            Province = "Tucuman",
            Locality = "San Miguel",
            Status = SupplierStatus.Verified,
            ArcaVerified = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        context.Users.Add(user);
        context.Suppliers.Add(supplier);
        await context.SaveChangesAsync();
        return supplier.Id;
    }

    private static async Task<Guid> SeedSupplierWithName(ApplicationDbContext context, string businessName)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = $"proveedor-{Guid.NewGuid():N}@test.com",
            PasswordHash = "hash",
            FirstName = businessName,
            LastName = "",
            Role = UserRole.Proveedor,
            Active = true
        };

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Cuit = $"30-{Random.Shared.Next(10000000, 99999999)}-1",
            BusinessName = businessName,
            Email = user.Email,
            BusinessCategory = "Servicios",
            Province = "Tucuman",
            Locality = "San Miguel",
            Status = SupplierStatus.Verified,
            ArcaVerified = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        context.Users.Add(user);
        context.Suppliers.Add(supplier);
        await context.SaveChangesAsync();
        return supplier.Id;
    }

    private static async Task SeedCompanySupplier(ApplicationDbContext context, Guid companyId, Guid supplierId)
    {
        context.CompanySuppliers.Add(new CompanySupplier
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            SupplierId = supplierId,
            Status = CompanySupplierStatus.Enabled,
            LinkedAtUtc = DateTime.UtcNow,
            EvaluatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task AdjudicationFlow_ShouldSucceed()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var supplierId = await SeedSupplier(context);
        
        // Seed authority user
        var authority = new User
        {
            Id = Guid.NewGuid(),
            Email = "authority@test.com",
            PasswordHash = "hash",
            FirstName = "Roberto",
            LastName = "Diaz",
            Role = UserRole.Autoridad,
            Active = true,
            CompanyId = companyId
        };
        context.Users.Add(authority);
        
        // Seed evaluator user
        var evaluator = new User
        {
            Id = Guid.NewGuid(),
            Email = "evaluator@test.com",
            PasswordHash = "hash",
            FirstName = "Carla",
            LastName = "Nunez",
            Role = UserRole.Evaluador,
            Active = true,
            CompanyId = companyId
        };
        context.Users.Add(evaluator);
        await context.SaveChangesAsync();

        // 1. Create Purchase Process
        var process = new PurchaseProcess
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            BuyerId = buyerId,
            Code = "PC-0001",
            Title = "Compra Adjudicar",
            EstimatedBudget = 1000000m,
            Status = PurchaseProcessStatus.Draft,
            CreatedAtUtc = DateTime.UtcNow
        };
        context.PurchaseProcesses.Add(process);
        await context.SaveChangesAsync();

        // 2. Publish (Send to Approval)
        var publishHandler = new PublishPurchaseProcessCommandHandler(context);
        var publishedResult = await publishHandler.Handle(new PublishPurchaseProcessCommand(companyId, process.Id), CancellationToken.None);
        Assert.Equal(PurchaseProcessStatus.Approved, publishedResult.Status);

        // 3. Reject first (just to test reject workflow)
        var rejectHandler = new RejectPurchaseProcessCommandHandler(context);
        var rejectedResult = await rejectHandler.Handle(new RejectPurchaseProcessCommand(companyId, process.Id, authority.Id, "Falta documentación"), CancellationToken.None);
        Assert.Equal(PurchaseProcessStatus.Rejected, rejectedResult.Status);
        Assert.Equal("Falta documentación", rejectedResult.RejectionReason);

        // Reset to pending for approve test (simulating buyer corrected and re-submitted)
        process.Status = PurchaseProcessStatus.PendingApproval;
        await context.SaveChangesAsync();

        // 4. Approve
        var approveHandler = new ApprovePurchaseProcessCommandHandler(context);
        var approvedResult = await approveHandler.Handle(new ApprovePurchaseProcessCommand(companyId, process.Id, authority.Id), CancellationToken.None);
        Assert.Equal(PurchaseProcessStatus.Approved, approvedResult.Status);

        // Manually mark the evaluation act as signed for testing
        var dbProcess = await context.PurchaseProcesses.FindAsync(process.Id);
        dbProcess.IsEvaluationActSigned = true;
        await context.SaveChangesAsync();

        // 5. Start Auction
        var fakeCache = new MockAuctionStateCache();
        var startAuctionHandler = new StartAuctionCommandHandler(context, fakeCache);
        await startAuctionHandler.Handle(new StartAuctionCommand
        {
            CompanyId = companyId,
            PurchaseProcessId = process.Id,
            DurationMinutes = 10
        }, CancellationToken.None);
        
        var updatedProcess = await context.PurchaseProcesses.FindAsync(process.Id);
        Assert.Equal(PurchaseProcessStatus.InAuction, updatedProcess.Status);

        // 6. Close Auction -> Goes to Evaluation
        var auction = await context.Auctions.FirstAsync(a => a.PurchaseProcessId == process.Id);
        var closeAuctionHandler = new CloseAuctionCommandHandler(context, fakeCache);
        await closeAuctionHandler.Handle(new CloseAuctionCommand(companyId, auction.Id), CancellationToken.None);
        
        updatedProcess = await context.PurchaseProcesses.FindAsync(process.Id);
        Assert.Equal(PurchaseProcessStatus.Evaluation, updatedProcess.Status);

        // 7. Register Evaluation
        var evaluateHandler = new RegisterEvaluationCommandHandler(context);
        var evaluatedResult = await evaluateHandler.Handle(new RegisterEvaluationCommand(companyId, process.Id, evaluator.Id, "Proveedor Test", "Mejor oferta económica"), CancellationToken.None);
        Assert.NotNull(evaluatedResult.Evaluation);
        Assert.Equal("Proveedor Test", evaluatedResult.Evaluation.RecomendadoProveedor);

        // 8. Adjudicate Process
        var mockPdfGen = new MockPdfGenerator();
        var adjudicateHandler = new AdjudicateProcessCommandHandler(context, mockPdfGen);
        var adjudicatedResult = await adjudicateHandler.Handle(new AdjudicateProcessCommand(companyId, process.Id, authority.Id), CancellationToken.None);
        
        Assert.Equal(PurchaseProcessStatus.Adjudicated, adjudicatedResult.Status);
        Assert.NotNull(adjudicatedResult.Award);
        Assert.Equal("Proveedor Test", adjudicatedResult.Award.Proveedor);
        Assert.Contains($"/purchase-processes/{process.Id}/awards/", adjudicatedResult.Award.ActaUrl);

        var dbAward = await context.Awards.FirstAsync(a => a.PurchaseProcessId == process.Id);
        Assert.True(File.Exists(dbAward.DocumentPath));
        Assert.NotNull(dbAward.DocumentTemplateId);
        Assert.Equal(64, dbAward.DocumentHash.Length);
        Assert.Equal(64, dbAward.ImmutableHash.Length);
        Assert.Equal(dbAward.DocumentHash, adjudicatedResult.Award.DocumentHash);
        Assert.Equal(dbAward.ImmutableHash, adjudicatedResult.Award.ImmutableHash);

        dbAward.Amount += 1;
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => context.SaveChangesAsync());
        Assert.Equal("Las adjudicaciones registradas son inmutables.", exception.Message);
    }

    [Fact]
    public async Task AssistedAwardRecommendation_ShouldReturnWinnerSavingsAndDetectedRisks()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var evaluatorId = await SeedUser(context, companyId, UserRole.Evaluador, "evaluador");
        var supplierOneId = await SeedSupplierWithName(context, "Proveedor Riesgo");
        var supplierTwoId = await SeedSupplierWithName(context, "Proveedor Apto");

        var process = new PurchaseProcess
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            BuyerId = buyerId,
            Code = "PC-DICTAMEN",
            Title = "Compra con dictamen",
            EstimatedBudget = 100000m,
            Status = PurchaseProcessStatus.Evaluation,
            CreatedAtUtc = DateTime.UtcNow,
            IsEvaluationActSigned = true
        };

        var auction = new Auction
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            PurchaseProcessId = process.Id,
            BasePrice = 100000m,
            MinimumDecrementPercentage = 1,
            Status = AuctionStatus.Closed,
            StartsAtUtc = DateTime.UtcNow.AddMinutes(-20),
            EndsAtUtc = DateTime.UtcNow.AddMinutes(-5),
            ClosedAtUtc = DateTime.UtcNow.AddMinutes(-5),
            PabThreshold = 90000m,
            Bids =
            [
                new Bid
                {
                    Id = Guid.NewGuid(),
                    SupplierId = supplierOneId,
                    Amount = 85000m,
                    PlacedAtUtc = DateTime.UtcNow.AddMinutes(-10),
                    IsPab = true,
                    SequenceNumber = 1,
                    PreviousHash = string.Empty,
                    Hash = "hash-1"
                },
                new Bid
                {
                    Id = Guid.NewGuid(),
                    SupplierId = supplierTwoId,
                    Amount = 92000m,
                    PlacedAtUtc = DateTime.UtcNow.AddMinutes(-9),
                    IsPab = false,
                    SequenceNumber = 2,
                    PreviousHash = "hash-1",
                    Hash = "hash-2"
                }
            ]
        };

        context.PurchaseProcesses.Add(process);
        context.Auctions.Add(auction);
        context.SupplierEvaluations.AddRange(
            new SupplierEvaluation
            {
                Id = Guid.NewGuid(),
                PurchaseProcessId = process.Id,
                SupplierId = supplierOneId,
                IsExcluded = true,
                ExcludedReason = "No cumple requisito excluyente",
                EvaluatedById = evaluatorId,
                EvaluatedAtUtc = DateTime.UtcNow
            },
            new SupplierEvaluation
            {
                Id = Guid.NewGuid(),
                PurchaseProcessId = process.Id,
                SupplierId = supplierTwoId,
                TotalWeightedScore = 72m,
                IsExcluded = false,
                EvaluatedById = evaluatorId,
                EvaluatedAtUtc = DateTime.UtcNow
            });
        await context.SaveChangesAsync();

        var recommendation = await new GetAssistedAwardRecommendationQueryHandler(context)
            .Handle(new GetAssistedAwardRecommendationQuery(companyId, process.Id), CancellationToken.None);

        Assert.NotNull(recommendation);
        Assert.True(recommendation.HasRecommendation);
        Assert.Equal(supplierTwoId, recommendation.RecommendedSupplierId);
        Assert.Equal("Proveedor Apto", recommendation.RecommendedSupplierName);
        Assert.Equal(92000m, recommendation.RecommendedAmount);
        Assert.Equal(8000m, recommendation.SavingsAmount);
        Assert.Equal(8m, recommendation.SavingsPercentage);
        Assert.Contains(recommendation.Risks, r => r.Code == "lower_excluded_offer");
        Assert.Equal(2, recommendation.Candidates.Count);
    }

    [Fact]
    public async Task ContractFlow_ShouldAllowPartialReceptions()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var supplierId = await SeedSupplier(context);
        var supplier = await context.Suppliers.FirstAsync(s => s.Id == supplierId);
        var receiver = new User
        {
            Id = Guid.NewGuid(),
            Email = "receiver@test.com",
            PasswordHash = "hash",
            FirstName = "Laura",
            LastName = "Recepcion",
            Role = UserRole.Comprador,
            Active = true,
            CompanyId = companyId
        };

        var process = new PurchaseProcess
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            BuyerId = buyerId,
            Code = "PC-0099",
            Title = "Compra con recepcion parcial",
            EstimatedBudget = 500000m,
            Status = PurchaseProcessStatus.Adjudicated,
            CreatedAtUtc = DateTime.UtcNow,
            Items =
            [
                new PurchaseItem
                {
                    Id = Guid.NewGuid(),
                    Description = "Notebook",
                    Quantity = 10,
                    Unit = "unidad",
                    EstimatedUnitPrice = 30000
                },
                new PurchaseItem
                {
                    Id = Guid.NewGuid(),
                    Description = "Monitor",
                    Quantity = 5,
                    Unit = "unidad",
                    EstimatedUnitPrice = 40000
                }
            ]
        };
        var award = new Award
        {
            Id = Guid.NewGuid(),
            PurchaseProcessId = process.Id,
            SupplierId = supplier.Id,
            Amount = 500000m,
            AdjudicatedById = buyerId,
            AdjudicatedAtUtc = DateTime.UtcNow,
            Observations = "Adjudicado",
            DocumentPath = "/dummy/path/acta.pdf"
        };

        context.Users.Add(receiver);
        context.PurchaseProcesses.Add(process);
        context.Awards.Add(award);
        await context.SaveChangesAsync();

        var pdf = new MockPdfGenerator();
        var contract = await new CreateContractCommandHandler(context, pdf)
            .Handle(new CreateContractCommand
            {
                CompanyId = companyId,
                PurchaseProcessId = process.Id,
                Terms = "Entrega parcial permitida."
            }, CancellationToken.None);

        Assert.NotNull(contract);
        Assert.Equal(ContractStatus.Draft, contract.Status);

        var buyer = await context.Users.FindAsync(buyerId);
        Assert.NotNull(buyer);
        buyer.MfaEnabled = true;
        buyer.MfaSecret = "TEST";
        await context.SaveChangesAsync();

        var mfa = new MockMfaProvider();
        var signed = await new SignContractCommandHandler(context, pdf, mfa)
            .Handle(new SignContractCommand
            {
                CompanyId = companyId,
                PurchaseProcessId = process.Id,
                ContractId = contract.Id,
                SignedByOperatorId = buyerId,
                OtpCode = "000000"
            }, CancellationToken.None);

        Assert.NotNull(signed);
        Assert.Equal(ContractStatus.Active, signed.Status);
        Assert.Equal(PurchaseProcessStatus.Contracted, (await context.PurchaseProcesses.FindAsync(process.Id))!.Status);

        var emailMock = new MockEmailSender();
        var order = await new IssuePurchaseOrderCommandHandler(context, pdf, emailMock)
            .Handle(new IssuePurchaseOrderCommand
            {
                CompanyId = companyId,
                ContractId = contract.Id
            }, CancellationToken.None);

        Assert.NotNull(order);
        Assert.Equal(PurchaseOrderStatus.Issued, order.Status);

        var firstReception = await new ConfirmReceptionCommandHandler(context, pdf)
            .Handle(new ConfirmReceptionCommand
            {
                CompanyId = companyId,
                PurchaseOrderId = order.Id,
                ReceivedById = receiver.Id,
                Items =
                [
                    new ReceptionConfirmationItemInputDto
                    {
                        PurchaseItemId = process.Items[0].Id,
                        QuantityReceived = 4
                    }
                ]
            }, CancellationToken.None);

        Assert.NotNull(firstReception);
        Assert.Equal(PurchaseOrderStatus.PartiallyReceived, (await context.PurchaseOrders.FindAsync(order.Id))!.Status);
        Assert.Equal(PurchaseProcessStatus.PurchaseOrderIssued, (await context.PurchaseProcesses.FindAsync(process.Id))!.Status);

        await new ConfirmReceptionCommandHandler(context, pdf)
            .Handle(new ConfirmReceptionCommand
            {
                CompanyId = companyId,
                PurchaseOrderId = order.Id,
                ReceivedById = receiver.Id,
                Items =
                [
                    new ReceptionConfirmationItemInputDto
                    {
                        PurchaseItemId = process.Items[0].Id,
                        QuantityReceived = 6
                    },
                    new ReceptionConfirmationItemInputDto
                    {
                        PurchaseItemId = process.Items[1].Id,
                        QuantityReceived = 5
                    }
                ]
            }, CancellationToken.None);

        Assert.Equal(PurchaseOrderStatus.Received, (await context.PurchaseOrders.FindAsync(order.Id))!.Status);
        Assert.Equal(PurchaseProcessStatus.Received, (await context.PurchaseProcesses.FindAsync(process.Id))!.Status);
    }

    [Fact]
    public async Task AdjudicateProcess_ShouldCreateMultipleAwardsByItems()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var supplierOneId = await SeedSupplier(context);
        var supplierTwoId = await SeedSupplier(context);
        var evaluator = new User
        {
            Id = Guid.NewGuid(),
            Email = "multi-evaluator@test.com",
            PasswordHash = "hash",
            FirstName = "Eva",
            LastName = "Multi",
            Role = UserRole.Evaluador,
            Active = true,
            CompanyId = companyId
        };
        var authority = new User
        {
            Id = Guid.NewGuid(),
            Email = "multi-authority@test.com",
            PasswordHash = "hash",
            FirstName = "Auto",
            LastName = "Ridad",
            Role = UserRole.Autoridad,
            Active = true,
            CompanyId = companyId
        };

        var itemOne = new PurchaseItem
        {
            Id = Guid.NewGuid(),
            Description = "Item proveedor uno",
            Quantity = 2,
            Unit = "unidad",
            EstimatedUnitPrice = 100
        };
        var itemTwo = new PurchaseItem
        {
            Id = Guid.NewGuid(),
            Description = "Item proveedor dos",
            Quantity = 3,
            Unit = "unidad",
            EstimatedUnitPrice = 200
        };
        var process = new PurchaseProcess
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            BuyerId = buyerId,
            Code = "PC-MULTI",
            Title = "Compra multi proveedor",
            EstimatedBudget = 800,
            Status = PurchaseProcessStatus.Evaluation,
            CreatedAtUtc = DateTime.UtcNow,
            Items = [itemOne, itemTwo],
            Evaluation = new Evaluation
            {
                Id = Guid.NewGuid(),
                EvaluatorId = evaluator.Id,
                RecommendedSupplier = "Proveedor Test",
                Observations = "Adjudicacion por item",
                CreatedAtUtc = DateTime.UtcNow
            }
        };

        context.Users.AddRange(evaluator, authority);
        context.PurchaseProcesses.Add(process);
        await context.SaveChangesAsync();

        var result = await new AdjudicateProcessCommandHandler(context, new MockPdfGenerator())
            .Handle(new AdjudicateProcessCommand(
                companyId,
                process.Id,
                authority.Id,
                [
                    new AwardSelectionInputDto
                    {
                        SupplierId = supplierOneId,
                        Items =
                        [
                            new AwardItemInputDto
                            {
                                PurchaseItemId = itemOne.Id,
                                Quantity = 2,
                                UnitPrice = 90
                            }
                        ]
                    },
                    new AwardSelectionInputDto
                    {
                        SupplierId = supplierTwoId,
                        Items =
                        [
                            new AwardItemInputDto
                            {
                                PurchaseItemId = itemTwo.Id,
                                Quantity = 3,
                                UnitPrice = 180
                            }
                        ]
                    }
                ]), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(PurchaseProcessStatus.Adjudicated, result.Status);
        Assert.Equal(2, result.Awards.Count);
        Assert.All(result.Awards, award => Assert.Single(award.Items));
    }

    [Fact]
    public async Task DiagnoseDatabasePermissions()
    {
        var connectionString = "Host=ep-patient-resonance-ac52dman.sa-east-1.aws.neon.tech;Port=5432;Database=neondb;Username=neondb_owner;Password=npg_MoSTAghQlJ48;SSL Mode=Require;Trust Server Certificate=true;Timeout=60;Command Timeout=60;Keepalive=30";
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        using var context = new ApplicationDbContext(options, null);
        var compradorPermissions = await context.RolePermissions
            .Where(rp => rp.Role == UserRole.Comprador)
            .Select(rp => rp.Permission.Code)
            .ToListAsync();

        var allPermissions = await context.Permissions
            .Select(p => p.Code)
            .ToListAsync();

        var rolePermissionsCount = await context.RolePermissions.CountAsync();

        throw new Exception($"Comprador permissions: {string.Join(", ", compradorPermissions)}. All permissions in DB: {string.Join(", ", allPermissions)}. Total role permissions count: {rolePermissionsCount}");
    }

    [Fact]
    public async Task RespondToInvitation_ShouldSucceed_WhenAccepting()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var supplierId = await SeedSupplier(context);
        await SeedCompanySupplier(context, companyId, supplierId);

        var process = await new CreatePurchaseProcessCommandHandler(context)
            .Handle(new CreatePurchaseProcessCommand
            {
                CompanyId = companyId,
                BuyerId = buyerId,
                Title = "Compra de insumos",
                EstimatedBudget = 50000
            }, CancellationToken.None);

        var invitation = await new InviteSupplierCommandHandler(context)
            .Handle(new InviteSupplierCommand
            {
                CompanyId = companyId,
                PurchaseProcessId = process.Id,
                SupplierId = supplierId
            }, CancellationToken.None);

        var handler = new RespondToInvitationCommandHandler(context);
        var command = new RespondToInvitationCommand
        {
            InvitationId = invitation.Id,
            SupplierId = supplierId,
            NewStatus = InvitationStatus.Accepted
        };

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.Equal(InvitationStatus.Accepted, result.Status);
        Assert.Null(result.RejectionReason);

        var invitationDb = await context.Invitations.FindAsync(invitation.Id);
        Assert.NotNull(invitationDb);
        Assert.Equal(InvitationStatus.Accepted, invitationDb.Status);
        Assert.Null(invitationDb.RejectionReason);
    }

    [Fact]
    public async Task RespondToInvitation_ShouldFail_WhenRejectingWithoutReason()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var supplierId = await SeedSupplier(context);
        await SeedCompanySupplier(context, companyId, supplierId);

        var process = await new CreatePurchaseProcessCommandHandler(context)
            .Handle(new CreatePurchaseProcessCommand
            {
                CompanyId = companyId,
                BuyerId = buyerId,
                Title = "Compra de insumos",
                EstimatedBudget = 50000
            }, CancellationToken.None);

        var invitation = await new InviteSupplierCommandHandler(context)
            .Handle(new InviteSupplierCommand
            {
                CompanyId = companyId,
                PurchaseProcessId = process.Id,
                SupplierId = supplierId
            }, CancellationToken.None);

        var handler = new RespondToInvitationCommandHandler(context);
        var command = new RespondToInvitationCommand
        {
            InvitationId = invitation.Id,
            SupplierId = supplierId,
            NewStatus = InvitationStatus.Rejected,
            RejectionReason = null
        };

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(command, CancellationToken.None));
        Assert.Equal("Debe especificar un motivo para rechazar la invitación.", exception.Message);
    }

    [Fact]
    public async Task RespondToInvitation_ShouldSucceed_WhenRejectingWithReason()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var supplierId = await SeedSupplier(context);
        await SeedCompanySupplier(context, companyId, supplierId);

        var process = await new CreatePurchaseProcessCommandHandler(context)
            .Handle(new CreatePurchaseProcessCommand
            {
                CompanyId = companyId,
                BuyerId = buyerId,
                Title = "Compra de insumos",
                EstimatedBudget = 50000
            }, CancellationToken.None);

        var invitation = await new InviteSupplierCommandHandler(context)
            .Handle(new InviteSupplierCommand
            {
                CompanyId = companyId,
                PurchaseProcessId = process.Id,
                SupplierId = supplierId
            }, CancellationToken.None);

        var handler = new RespondToInvitationCommandHandler(context);
        var command = new RespondToInvitationCommand
        {
            InvitationId = invitation.Id,
            SupplierId = supplierId,
            NewStatus = InvitationStatus.Rejected,
            RejectionReason = "No tengo stock disponible en este momento."
        };

        var result = await handler.Handle(command, CancellationToken.None);

        Assert.Equal(InvitationStatus.Rejected, result.Status);
        Assert.Equal("No tengo stock disponible en este momento.", result.RejectionReason);

        var invitationDb = await context.Invitations.FindAsync(invitation.Id);
        Assert.NotNull(invitationDb);
        Assert.Equal(InvitationStatus.Rejected, invitationDb.Status);
        Assert.Equal("No tengo stock disponible en este momento.", invitationDb.RejectionReason);
    }

    private class MockAuctionStateCache : IAuctionStateCache
    {
        public Task<AuctionState?> GetAsync(Guid auctionId, CancellationToken cancellationToken) => Task.FromResult<AuctionState?>(null);
        public Task SetAsync(AuctionState state, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task RemoveAsync(Guid auctionId, CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private class MockPdfGenerator : IPdfGenerator
    {
        public string GenerateAwardAct(PurchaseProcess process, Award award, Supplier supplier, User approver, List<Bid> bids, DocumentTemplate? template = null)
        {
            var path = Path.Combine(Path.GetTempPath(), "sicst-tests", "awards", $"{award.Id}.pdf");
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            File.WriteAllText(path, $"award-act|{process.Id}|{award.Id}|{supplier.Id}|{template?.Version}");
            return path;
        }

        public string GenerateContract(PurchaseProcess process, Contract contract, Supplier supplier, DocumentTemplate? template = null)
        {
            return "/dummy/path/contract.pdf";
        }

        public string GeneratePurchaseOrder(PurchaseProcess process, PurchaseOrder order, Supplier supplier, DocumentTemplate? template = null)
        {
            return "/dummy/path/order.pdf";
        }

        public string GenerateReceptionConfirmation(PurchaseOrder order, ReceptionConfirmation reception)
        {
            return "/dummy/path/reception.pdf";
        }

        public string GenerateEvaluationAct(PurchaseProcess process, List<Invitation> invitations, User evaluator, string hash, string signature, byte[]? signatureImageBytes)
        {
            return "/dummy/path/evalact.pdf";
        }

        public string GenerateAuctionClosingAct(Auction auction, string hash, List<AuctionComparisonRow> comparisonRows)
        {
            return "/dummy/path/auction-closing.pdf";
        }
    }

    private class MockMfaProvider : IMfaProvider
    {
        public string GenerateSecret() => "TESTSECRET";
        public string GetTotpUri(string issuer, string accountName, string secret) => "otpauth://totp/test";
        public bool VerifyCode(string secret, string code) => true;
    }

    private class MockEmailSender : IEmailSender
    {
        public Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }
}
