using Microsoft.EntityFrameworkCore;
using SICST.Application.Modules.Suppliers.Commands;
using SICST.Application.Modules.Suppliers.Queries;
using SICST.Domain.Entities;
using SICST.Infrastructure.Security;
using SICST.Persistence.Contexts;
using Xunit;

namespace SICST.Tests.Suppliers;

public class SupplierHandlerTests
{
    private ApplicationDbContext CreateDbContext()
    {
        return TestDbContextFactory.Create(new SICST.Tests.TestCurrentTenant());
    }

    [Fact]
    public async Task RegisterSupplier_ShouldCreateUserAndSupplierProfile()
    {
        using var context = CreateDbContext();
        var handler = new RegisterSupplierCommandHandler(context, new PasswordHasher());

        var command = new RegisterSupplierCommand
        {
            BusinessName = "Insumos del Norte SRL",
            Cuit = "30-12345678-1",
            Email = "ventas@insumosnorte.com",
            BusinessCategory = "Insumos",
            Province = "Tucuman",
            Locality = "San Miguel de Tucuman"
        };

        var result = await handler.Handle(command, CancellationToken.None);

        var user = await context.Users.FindAsync(result.UserId);
        var supplier = await context.Suppliers.FindAsync(result.SupplierId);

        Assert.NotNull(user);
        Assert.NotNull(supplier);
        Assert.Equal(UserRole.Proveedor, user.Role);
        Assert.False(user.Active);
        Assert.Null(user.CompanyId);
        Assert.Equal(user.Id, supplier.UserId);
        Assert.Equal("30-12345678-1", supplier.Cuit);
        Assert.Equal("Insumos", supplier.BusinessCategory);
        Assert.Equal(SupplierStatus.Pending, supplier.Status);
        Assert.Equal(ArcaVerificationStatus.Pending, supplier.ArcaVerificationStatus);
        Assert.False(supplier.ArcaVerified);
    }

    [Fact]
    public async Task RegisterSupplier_ShouldThrow_WhenCuitAlreadyExists()
    {
        using var context = CreateDbContext();
        var handler = new RegisterSupplierCommandHandler(context, new PasswordHasher());

        var command = new RegisterSupplierCommand
        {
            BusinessName = "Proveedor Uno",
            Cuit = "30-12345678-1",
            Email = "uno@proveedor.com",
            BusinessCategory = "Servicios",
            Province = "Tucuman",
            Locality = "Tafi Viejo"
        };

        await handler.Handle(command, CancellationToken.None);

        var duplicate = command with
        {
            BusinessName = "Proveedor Dos",
            Email = "dos@proveedor.com"
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(duplicate, CancellationToken.None));
    }

    [Fact]
    public async Task GetSupplierByUserId_ShouldReturnSupplier()
    {
        using var context = CreateDbContext();
        var userId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();

        context.Users.Add(new User
        {
            Id = userId,
            Email = "proveedor@test.com",
            PasswordHash = "hash",
            FirstName = "Proveedor",
            LastName = "",
            Role = UserRole.Proveedor,
            Active = true
        });

        context.Suppliers.Add(new Supplier
        {
            Id = supplierId,
            UserId = userId,
            BusinessName = "Proveedor Test",
            Cuit = "30-99999999-1",
            Email = "proveedor@test.com",
            BusinessCategory = "Servicios",
            Province = "Buenos Aires",
            Locality = "La Plata",
            Status = SupplierStatus.Pending,
            CreatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();

        var handler = new GetSupplierByUserIdQueryHandler(context);
        var result = await handler.Handle(new GetSupplierByUserIdQuery(userId), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(supplierId, result.Id);
        Assert.Equal("Proveedor Test", result.BusinessName);
        Assert.Equal(SupplierStatus.Pending, result.Status);
    }

    [Fact]
    public async Task RegisterSupplier_ShouldCreatePendingSupplier_WhenCuitHasInvalidCheckDigit()
    {
        using var context = CreateDbContext();
        var handler = new RegisterSupplierCommandHandler(context, new PasswordHasher());

        var command = new RegisterSupplierCommand
        {
            BusinessName = "Proveedor Invalido CUIT",
            Cuit = "30-12345678-0", // mathematically invalid check digit (should be 9)
            Email = "invalido@proveedor.com",
            BusinessCategory = "Servicios",
            Province = "Buenos Aires",
            Locality = "Tandil"
        };

        var result = await handler.Handle(command, CancellationToken.None);
        var supplier = await context.Suppliers.FindAsync(result.SupplierId);

        Assert.NotNull(supplier);
        Assert.Equal(SupplierStatus.Pending, supplier.Status);
        Assert.False(supplier.ArcaVerified);
    }

    [Fact]
    public async Task RegisterSupplierDocument_ShouldStoreSha256AndValidStatus_WhenExpiryIsFuture()
    {
        using var context = CreateDbContext();
        var supplierId = await SeedSupplierAsync(context);
        var handler = new RegisterSupplierDocumentCommandHandler(context);

        var result = await handler.Handle(new RegisterSupplierDocumentCommand
        {
            SupplierId = supplierId,
            Type = SupplierDocumentType.CuitCertificate,
            FileName = "constancia-cuit.pdf",
            ContentType = "application/pdf",
            StoragePath = $"uploads/suppliers/{supplierId}/constancia-cuit.pdf",
            Sha256Hash = "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
            ExpiresAtUtc = DateTime.UtcNow.AddDays(45)
        }, CancellationToken.None);

        Assert.Equal("abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd", result.Sha256Hash);
        Assert.Equal(SupplierDocumentStatus.Valid, result.Status);
        Assert.Null(result.AlertSentAtUtc);
    }

    [Fact]
    public async Task RegisterSupplierDocument_ShouldMarkExpiringSoon_WhenExpiryIsWithinThirtyDays()
    {
        using var context = CreateDbContext();
        var supplierId = await SeedSupplierAsync(context);
        var handler = new RegisterSupplierDocumentCommandHandler(context);

        var result = await handler.Handle(new RegisterSupplierDocumentCommand
        {
            SupplierId = supplierId,
            Type = SupplierDocumentType.TaxCertificate,
            FileName = "certificado-fiscal.pdf",
            ContentType = "application/pdf",
            StoragePath = $"uploads/suppliers/{supplierId}/certificado-fiscal.pdf",
            Sha256Hash = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            ExpiresAtUtc = DateTime.UtcNow.AddDays(10)
        }, CancellationToken.None);

        Assert.Equal(SupplierDocumentStatus.ExpiringSoon, result.Status);
    }

    [Fact]
    public async Task RegisterSupplierDocument_ShouldMarkExpired_WhenExpiryIsPast()
    {
        using var context = CreateDbContext();
        var supplierId = await SeedSupplierAsync(context);
        var handler = new RegisterSupplierDocumentCommandHandler(context);

        var result = await handler.Handle(new RegisterSupplierDocumentCommand
        {
            SupplierId = supplierId,
            Type = SupplierDocumentType.LegalDocument,
            FileName = "estatuto.pdf",
            ContentType = "application/pdf",
            StoragePath = $"uploads/suppliers/{supplierId}/estatuto.pdf",
            Sha256Hash = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
            ExpiresAtUtc = DateTime.UtcNow.AddDays(-1)
        }, CancellationToken.None);

        Assert.Equal(SupplierDocumentStatus.Expired, result.Status);
    }

    [Fact]
    public async Task GetSupplierDocuments_ShouldReturnOnlyRequestedSupplierDocuments()
    {
        using var context = CreateDbContext();
        var supplierId = await SeedSupplierAsync(context, "uno@proveedor.com", "30-11111111-8");
        var otherSupplierId = await SeedSupplierAsync(context, "dos@proveedor.com", "30-22222222-5");

        context.SupplierDocuments.AddRange(
            CreateDocument(supplierId, "documento-uno.pdf", "1111111111111111111111111111111111111111111111111111111111111111"),
            CreateDocument(otherSupplierId, "documento-dos.pdf", "2222222222222222222222222222222222222222222222222222222222222222"));
        await context.SaveChangesAsync();

        var handler = new GetSupplierDocumentsQueryHandler(context);
        var result = await handler.Handle(new GetSupplierDocumentsQuery(supplierId), CancellationToken.None);

        Assert.Single(result);
        Assert.Equal(supplierId, result[0].SupplierId);
        Assert.Equal("documento-uno.pdf", result[0].FileName);
    }

    [Fact]
    public async Task GetSupplierDocuments_ShouldRegisterAlertSentAt_WhenDocumentRequiresAttention()
    {
        using var context = CreateDbContext();
        var supplierId = await SeedSupplierAsync(context);
        var document = CreateDocument(
            supplierId,
            "por-vencer.pdf",
            "3333333333333333333333333333333333333333333333333333333333333333",
            DateTime.UtcNow.AddDays(3));
        document.Status = SupplierDocumentStatus.Valid;
        context.SupplierDocuments.Add(document);
        await context.SaveChangesAsync();

        var handler = new GetSupplierDocumentsQueryHandler(context);
        var result = await handler.Handle(new GetSupplierDocumentsQuery(supplierId), CancellationToken.None);

        Assert.Equal(SupplierDocumentStatus.ExpiringSoon, result[0].Status);
        Assert.NotNull(result[0].AlertSentAtUtc);
    }

    [Fact]
    public async Task EnableSupplierForCompany_ShouldBlock_WhenStrictPolicyAndMissingDocuments()
    {
        using var context = CreateDbContext();
        var companyId = await SeedCompanyAsync(context, requireSupplierVerification: true);
        var supplierId = await SeedSupplierAsync(context);

        var handler = new EnableSupplierForCompanyCommandHandler(context);
        var result = await handler.Handle(new EnableSupplierForCompanyCommand
        {
            CompanyId = companyId,
            SupplierId = supplierId
        }, CancellationToken.None);

        Assert.Equal(CompanySupplierStatus.Blocked, result.Status);
        Assert.True(result.StrictPolicyApplied);
        Assert.Contains("documentacion", result.WarningMessage);
    }

    [Fact]
    public async Task EnableSupplierForCompany_ShouldEnableWithWarning_WhenFlexiblePolicyAndMissingDocuments()
    {
        using var context = CreateDbContext();
        var companyId = await SeedCompanyAsync(context, requireSupplierVerification: false);
        var supplierId = await SeedSupplierAsync(context);

        var handler = new EnableSupplierForCompanyCommandHandler(context);
        var result = await handler.Handle(new EnableSupplierForCompanyCommand
        {
            CompanyId = companyId,
            SupplierId = supplierId
        }, CancellationToken.None);

        Assert.Equal(CompanySupplierStatus.EnabledWithWarning, result.Status);
        Assert.False(result.StrictPolicyApplied);
        Assert.Contains("documentacion", result.WarningMessage);
    }

    [Fact]
    public async Task EnableSupplierForCompany_ShouldEnable_WhenStrictPolicyAndDocumentsAreValid()
    {
        using var context = CreateDbContext();
        var companyId = await SeedCompanyAsync(context, requireSupplierVerification: true);
        var supplierId = await SeedSupplierAsync(context);
        context.SupplierDocuments.Add(CreateDocument(
            supplierId,
            "vigente.pdf",
            "4444444444444444444444444444444444444444444444444444444444444444"));
        await context.SaveChangesAsync();

        var handler = new EnableSupplierForCompanyCommandHandler(context);
        var result = await handler.Handle(new EnableSupplierForCompanyCommand
        {
            CompanyId = companyId,
            SupplierId = supplierId
        }, CancellationToken.None);

        Assert.Equal(CompanySupplierStatus.Enabled, result.Status);
        Assert.Null(result.WarningMessage);
    }

    [Fact]
    public async Task GetSuppliers_ShouldFilterByBusinessCategoryAndSameProvince()
    {
        using var context = CreateDbContext();
        await SeedSupplierAsync(context, "local@proveedor.com", "30-11111111-8", "Construccion", "Tucuman", "San Miguel");
        await SeedSupplierAsync(context, "lejano@proveedor.com", "30-22222222-5", "Construccion", "Cordoba", "Cordoba");
        await SeedSupplierAsync(context, "otro@proveedor.com", "30-33333333-2", "Limpieza", "Tucuman", "Yerba Buena");

        var handler = new GetSuppliersQueryHandler(context);
        var result = await handler.Handle(new GetSuppliersQuery(
            BusinessCategory: "Construccion",
            Province: "Tucuman",
            Proximity: "sameProvince"), CancellationToken.None);

        Assert.Single(result.Items);
        Assert.Equal("local@proveedor.com", result.Items[0].Email);
        Assert.Equal("Construccion", result.Items[0].BusinessCategory);
        Assert.Equal("Tucuman", result.Items[0].Province);
    }

    [Fact]
    public async Task ObserveSupplierDocument_ShouldCreateImmutableObservation()
    {
        using var context = CreateDbContext();
        var supplierId = await SeedSupplierAsync(context);
        var evaluatorId = await SeedEvaluatorAsync(context);
        var document = CreateDocument(supplierId, "observado.pdf", "5555555555555555555555555555555555555555555555555555555555555555");
        context.SupplierDocuments.Add(document);
        await context.SaveChangesAsync();

        var handler = new ObserveSupplierDocumentCommandHandler(context);
        var result = await handler.Handle(new ObserveSupplierDocumentCommand
        {
            DocumentId = document.Id,
            EvaluatorId = evaluatorId,
            Notes = "Falta firma del responsable."
        }, CancellationToken.None);

        Assert.Equal(SupplierDocumentReviewAction.Observation, result.Action);
        Assert.Equal("Falta firma del responsable.", result.Notes);
    }

    [Fact]
    public async Task SubmitSupplierDocumentRemediation_ShouldRegisterSupplierResponse()
    {
        using var context = CreateDbContext();
        var supplierId = await SeedSupplierAsync(context);
        var document = CreateDocument(supplierId, "subsanable.pdf", "6666666666666666666666666666666666666666666666666666666666666666");
        context.SupplierDocuments.Add(document);
        await context.SaveChangesAsync();

        var handler = new SubmitSupplierDocumentRemediationCommandHandler(context);
        var result = await handler.Handle(new SubmitSupplierDocumentRemediationCommand
        {
            DocumentId = document.Id,
            SupplierId = supplierId,
            Notes = "Se adjunta aclaracion y se cargara version corregida."
        }, CancellationToken.None);

        Assert.Equal(SupplierDocumentReviewAction.Remediation, result.Action);
        Assert.Null(result.ReviewerId);
    }

    [Fact]
    public async Task IssueSupplierDocumentVerdict_ShouldBeImmutableAndRegisterEvaluatorException()
    {
        using var context = CreateDbContext();
        var supplierId = await SeedSupplierAsync(context);
        var evaluatorId = await SeedEvaluatorAsync(context);
        var document = CreateDocument(supplierId, "dictamen.pdf", "7777777777777777777777777777777777777777777777777777777777777777");
        context.SupplierDocuments.Add(document);
        await context.SaveChangesAsync();

        var handler = new IssueSupplierDocumentVerdictCommandHandler(context);
        var result = await handler.Handle(new IssueSupplierDocumentVerdictCommand
        {
            DocumentId = document.Id,
            EvaluatorId = evaluatorId,
            Verdict = SupplierDocumentVerdict.ApprovedWithException,
            Notes = "Se acepta por urgencia operativa.",
            ExceptionReason = "Proveedor unico en la localidad."
        }, CancellationToken.None);

        Assert.Equal(SupplierDocumentReviewAction.Verdict, result.Action);
        Assert.Equal(SupplierDocumentVerdict.ApprovedWithException, result.Verdict);
        Assert.Equal("Proveedor unico en la localidad.", result.ExceptionReason);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(new IssueSupplierDocumentVerdictCommand
            {
                DocumentId = document.Id,
                EvaluatorId = evaluatorId,
                Verdict = SupplierDocumentVerdict.Approved,
                Notes = "Segundo dictamen."
            }, CancellationToken.None));
    }

    [Fact]
    public async Task SaveChanges_ShouldPreventDocumentReviewModification()
    {
        using var context = CreateDbContext();
        var supplierId = await SeedSupplierAsync(context);
        var evaluatorId = await SeedEvaluatorAsync(context);
        var document = CreateDocument(supplierId, "inmutable.pdf", "8888888888888888888888888888888888888888888888888888888888888888");
        context.SupplierDocuments.Add(document);
        await context.SaveChangesAsync();

        var review = ObserveSupplierDocumentCommandHandler.CreateReview(
            document.Id,
            evaluatorId,
            SupplierDocumentReviewAction.Verdict,
            "Dictamen final.",
            SupplierDocumentVerdict.Approved);
        context.SupplierDocumentReviews.Add(review);
        await context.SaveChangesAsync();

        review.Notes = "Intento de cambio.";

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            context.SaveChangesAsync(CancellationToken.None));
    }

    [Fact]
    public async Task IssueSupplierDocumentVerdict_ShouldUpdateSupplierStatusToVerified_WhenAllDocumentsApproved()
    {
        using var context = CreateDbContext();
        var supplierId = await SeedSupplierAsync(context, email: "supplier_pending@test.com", cuit: "30-12345678-0"); // ends with -0, so registered as Pending
        
        // Seeding sets Status as Verified, let's reset it to Pending for testing
        var supplier = await context.Suppliers.FindAsync(supplierId);
        Assert.NotNull(supplier);
        supplier.Status = SupplierStatus.Pending;
        await context.SaveChangesAsync();

        var evaluatorId = await SeedEvaluatorAsync(context);

        var doc1 = CreateDocument(supplierId, "doc1.pdf", "1111111111111111111111111111111111111111111111111111111111111111");
        var doc2 = CreateDocument(supplierId, "doc2.pdf", "2222222222222222222222222222222222222222222222222222222222222222");
        context.SupplierDocuments.AddRange(doc1, doc2);
        await context.SaveChangesAsync();

        var handler = new IssueSupplierDocumentVerdictCommandHandler(context);

        // Approve doc1
        await handler.Handle(new IssueSupplierDocumentVerdictCommand
        {
            DocumentId = doc1.Id,
            EvaluatorId = evaluatorId,
            Verdict = SupplierDocumentVerdict.Approved,
            Notes = "Doc 1 aprobado."
        }, CancellationToken.None);

        // Supplier status should still be Pending
        var supplierAfterFirst = await context.Suppliers.FindAsync(supplierId);
        Assert.Equal(SupplierStatus.Pending, supplierAfterFirst!.Status);

        // Approve doc2
        await handler.Handle(new IssueSupplierDocumentVerdictCommand
        {
            DocumentId = doc2.Id,
            EvaluatorId = evaluatorId,
            Verdict = SupplierDocumentVerdict.ApprovedWithException,
            Notes = "Doc 2 aprobado con excepcion.",
            ExceptionReason = "Se acepta excepcionalmente."
        }, CancellationToken.None);

        // Supplier status should now be Verified
        var supplierAfterSecond = await context.Suppliers.FindAsync(supplierId);
        Assert.Equal(SupplierStatus.Verified, supplierAfterSecond!.Status);
    }

    [Fact]
    public async Task IssueSupplierDocumentVerdict_ShouldUpdateSupplierStatusToRejected_WhenAnyDocumentIsRejected()
    {
        using var context = CreateDbContext();
        var supplierId = await SeedSupplierAsync(context);
        var evaluatorId = await SeedEvaluatorAsync(context);
        var doc = CreateDocument(supplierId, "doc.pdf", "1111111111111111111111111111111111111111111111111111111111111111");
        context.SupplierDocuments.Add(doc);
        await context.SaveChangesAsync();

        var handler = new IssueSupplierDocumentVerdictCommandHandler(context);

        await handler.Handle(new IssueSupplierDocumentVerdictCommand
        {
            DocumentId = doc.Id,
            EvaluatorId = evaluatorId,
            Verdict = SupplierDocumentVerdict.Rejected,
            Notes = "Documento rechazado por no ser valido."
        }, CancellationToken.None);

        var supplier = await context.Suppliers.FindAsync(supplierId);
        Assert.Equal(SupplierStatus.Rejected, supplier!.Status);
    }

    private static async Task<Guid> SeedSupplierAsync(
        ApplicationDbContext context,
        string email = "proveedor@test.com",
        string cuit = "30-99999999-1",
        string businessCategory = "Servicios",
        string province = "Buenos Aires",
        string locality = "La Plata")
    {
        var userId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();

        context.Users.Add(new User
        {
            Id = userId,
            Email = email,
            PasswordHash = "hash",
            FirstName = "Proveedor",
            LastName = "Test",
            Role = UserRole.Proveedor,
            Active = true
        });

        context.Suppliers.Add(new Supplier
        {
            Id = supplierId,
            UserId = userId,
            BusinessName = "Proveedor Test",
            Cuit = cuit,
            Email = email,
            BusinessCategory = businessCategory,
            Province = province,
            Locality = locality,
            Status = SupplierStatus.Verified,
            ArcaVerified = false,
            CreatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();
        return supplierId;
    }

    private static async Task<Guid> SeedCompanyAsync(ApplicationDbContext context, bool requireSupplierVerification)
    {
        var companyId = Guid.NewGuid();

        context.Companies.Add(new Company
        {
            Id = companyId,
            Name = $"Empresa {Guid.NewGuid():N}",
            Domain = $"empresa-{Guid.NewGuid():N}",
            IsPublicEntity = requireSupplierVerification
        });

        context.CompanyConfigurations.Add(new CompanyConfiguration
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            RequireSupplierVerification = requireSupplierVerification,
            UpdatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();
        return companyId;
    }

    private static async Task<Guid> SeedEvaluatorAsync(ApplicationDbContext context)
    {
        var userId = Guid.NewGuid();

        context.Users.Add(new User
        {
            Id = userId,
            Email = $"evaluador-{Guid.NewGuid():N}@test.com",
            PasswordHash = "hash",
            FirstName = "Eva",
            LastName = "Luador",
            Role = UserRole.Evaluador,
            Active = true
        });

        await context.SaveChangesAsync();
        return userId;
    }

    private static SupplierDocument CreateDocument(
        Guid supplierId,
        string fileName,
        string sha256Hash,
        DateTime? expiresAtUtc = null)
    {
        var expiry = expiresAtUtc ?? DateTime.UtcNow.AddDays(90);

        return new SupplierDocument
        {
            Id = Guid.NewGuid(),
            SupplierId = supplierId,
            Type = SupplierDocumentType.Other,
            FileName = fileName,
            ContentType = "application/pdf",
            StoragePath = $"uploads/suppliers/{supplierId}/{fileName}",
            UploadedAtUtc = DateTime.UtcNow,
            Sha256Hash = sha256Hash,
            ExpiresAtUtc = expiry,
            Status = SupplierDocumentStatus.Valid
        };
    }
}
