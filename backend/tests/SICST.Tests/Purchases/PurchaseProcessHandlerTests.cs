using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Auctions.Commands;
using SICST.Application.Auctions.DTOs;
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

        var context = new ApplicationDbContext(options);
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
        Assert.Equal(PurchaseProcessStatus.PendingApproval, published.Status);
        Assert.NotNull(published.PublishedAtUtc);
    }

    [Fact]
    public async Task InviteSupplier_ShouldPreventDuplicateInvitation()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var supplierId = await SeedSupplier(context);
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
        Assert.Equal(PurchaseProcessStatus.PendingApproval, publishedResult.Status);

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
        Assert.Equal("/dummy/path/acta.pdf", dbAward.DocumentPath);
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
        Assert.Equal(PurchaseProcessStatus.Contracted, (await context.PurchaseProcesses.FindAsync(process.Id))!.Status);

        var order = await new IssuePurchaseOrderCommandHandler(context, pdf)
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

    private class MockAuctionStateCache : IAuctionStateCache
    {
        public Task<AuctionState?> GetAsync(Guid auctionId, CancellationToken cancellationToken) => Task.FromResult<AuctionState?>(null);
        public Task SetAsync(AuctionState state, CancellationToken cancellationToken) => Task.CompletedTask;
        public Task RemoveAsync(Guid auctionId, CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private class MockPdfGenerator : IPdfGenerator
    {
        public string GenerateAwardAct(PurchaseProcess process, Award award, Supplier supplier, User approver, List<Bid> bids)
        {
            return "/dummy/path/acta.pdf";
        }

        public string GenerateContract(PurchaseProcess process, Contract contract, Supplier supplier)
        {
            return "/dummy/path/contract.pdf";
        }

        public string GeneratePurchaseOrder(PurchaseProcess process, PurchaseOrder order, Supplier supplier)
        {
            return "/dummy/path/order.pdf";
        }

        public string GenerateReceptionConfirmation(PurchaseOrder order, ReceptionConfirmation reception)
        {
            return "/dummy/path/reception.pdf";
        }
    }
}
