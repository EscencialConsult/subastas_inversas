using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SICST.Application.Modules.Identity.Auth.Commands;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;
using SICST.Infrastructure.Security;
using SICST.Persistence.Contexts;
using SICST.Tests;
using Xunit;

namespace SICST.Tests.Auth;

public class AuthTests
{
    private (ApplicationDbContext context, IConfiguration config) CreateContextAndConfig()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        
        var context = new ApplicationDbContext(options, new TestCurrentTenant());
        context.Database.EnsureCreated();

        var settings = new Dictionary<string, string?>
        {
            { "Jwt:Secret", "super_secret_key_that_is_at_least_32_characters_long!" },
            { "Jwt:Issuer", "TestIssuer" },
            { "Jwt:Audience", "TestAudience" }
        };

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();

        return (context, config);
    }

    [Fact]
    public void PasswordHasher_ShouldHashAndVerifyCorrectly()
    {
        // Arrange
        var hasher = new PasswordHasher();
        var password = "SecurePassword123!";

        // Act
        var hash = hasher.Hash(password);
        var isValid = hasher.Verify(password, hash);
        var isInvalid = hasher.Verify("WrongPassword", hash);

        // Assert
        Assert.NotEmpty(hash);
        Assert.NotEqual(password, hash);
        Assert.True(isValid);
        Assert.False(isInvalid);
    }

    [Fact]
    public async Task RegisterUser_ShouldSaveHashedPassword()
    {
        // Arrange
        var (context, _) = CreateContextAndConfig();
        var hasher = new PasswordHasher();
        var handler = new RegisterUserCommandHandler(context, hasher);
        
        var command = new RegisterUserCommand
        {
            Email = "newuser@test.com",
            Password = "MyPassword123!",
            FirstName = "John",
            LastName = "Doe",
            Role = UserRole.Comprador
        };

        // Act
        var userId = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotEqual(Guid.Empty, userId);
        var user = await context.Users.FindAsync(userId);
        Assert.NotNull(user);
        Assert.Equal("newuser@test.com", user.Email);
        Assert.True(hasher.Verify("MyPassword123!", user.PasswordHash));
    }

    [Fact]
    public async Task RegisterUser_ShouldThrow_WhenEmailAlreadyExists()
    {
        // Arrange
        var (context, _) = CreateContextAndConfig();
        var hasher = new PasswordHasher();
        context.Users.Add(new User 
        { 
            Id = Guid.NewGuid(), 
            Email = "duplicate@test.com", 
            PasswordHash = hasher.Hash("somepass"), 
            FirstName = "First", 
            LastName = "Last" 
        });
        await context.SaveChangesAsync();

        var handler = new RegisterUserCommandHandler(context, hasher);
        var command = new RegisterUserCommand
        {
            Email = "DUPLICATE@test.com", // Case-insensitive check
            Password = "password1",
            FirstName = "User",
            LastName = "Name",
            Role = UserRole.Proveedor
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => 
            handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Login_ShouldReturnToken_WhenCredentialsAreValid()
    {
        // Arrange
        var (context, config) = CreateContextAndConfig();
        var hasher = new PasswordHasher();
        var jwtProvider = new JwtProvider(config);
        
        var email = "login@test.com";
        var password = "CorrectPassword123!";
        
        context.Users.Add(new User 
        { 
            Id = Guid.NewGuid(), 
            Email = email, 
            PasswordHash = hasher.Hash(password), 
            FirstName = "Login", 
            LastName = "User",
            Role = UserRole.SuperAdmin
        });
        await context.SaveChangesAsync();

        var handler = new LoginCommandHandler(context, hasher, jwtProvider);
        var command = new LoginCommand { Email = email, Password = password };

        // Act
        var response = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(response);
        Assert.NotEmpty(response.Token);
        Assert.Equal(email, response.Email);
        Assert.Equal("SuperAdmin", response.Role);
    }

    [Fact]
    public async Task Login_ShouldReturnCompanyBranding_WhenUserHasCompany()
    {
        // Arrange
        var (context, config) = CreateContextAndConfig();
        var hasher = new PasswordHasher();
        var jwtProvider = new JwtProvider(config);

        var companyId = Guid.NewGuid();
        var email = "tenant-admin@test.com";
        var password = "CorrectPassword123!";

        context.Companies.Add(new Company
        {
            Id = companyId,
            Name = "Empresa Test",
            Domain = "empresa-test",
            Logo = "https://cdn.test/logo.png",
            PrimaryColor = "#0055AA",
            IsPublicEntity = true
        });
        context.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = hasher.Hash(password),
            FirstName = "Tenant",
            LastName = "Admin",
            Role = UserRole.Admin,
            CompanyId = companyId
        });
        await context.SaveChangesAsync();

        var handler = new LoginCommandHandler(context, hasher, jwtProvider);
        var command = new LoginCommand { Email = email, Password = password };

        // Act
        var response = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.Equal(companyId, response.CompanyId);
        Assert.Equal("Empresa Test", response.CompanyName);
        Assert.Equal("https://cdn.test/logo.png", response.CompanyLogo);
        Assert.Equal("#0055AA", response.CompanyPrimaryColor);
    }

    [Fact]
    public async Task Login_ShouldRequireMfa_WhenMfaIsEnabled()
    {
        // Arrange
        var (context, config) = CreateContextAndConfig();
        var hasher = new PasswordHasher();
        var jwtProvider = new JwtProvider(config);

        var email = "mfa@test.com";
        var password = "CorrectPassword123!";

        context.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = hasher.Hash(password),
            FirstName = "Mfa",
            LastName = "User",
            Role = UserRole.Admin,
            Active = true,
            MfaEnabled = true,
            MfaSecret = "JBSWY3DPEHPK3PXP"
        });
        await context.SaveChangesAsync();

        var handler = new LoginCommandHandler(context, hasher, jwtProvider);

        // Act
        var response = await handler.Handle(
            new LoginCommand { Email = email, Password = password },
            CancellationToken.None);

        // Assert
        Assert.True(response.RequiresMfa);
        Assert.True(response.MfaEnabled);
        Assert.False(string.IsNullOrWhiteSpace(response.MfaToken));
        Assert.Empty(response.Token);
        Assert.Empty(response.RefreshToken);
    }

    [Fact]
    public async Task RefreshToken_ShouldRotateToken_WhenRefreshTokenIsValid()
    {
        // Arrange
        var (context, config) = CreateContextAndConfig();
        var jwtProvider = new JwtProvider(config);

        var refreshToken = RefreshTokenHelper.Generate();
        var email = "refresh@test.com";
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = "hash",
            FirstName = "Refresh",
            LastName = "User",
            Role = UserRole.Admin,
            Active = true,
            RefreshTokenHash = RefreshTokenHelper.Hash(refreshToken),
            RefreshTokenExpiresAtUtc = DateTime.UtcNow.AddDays(1)
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var handler = new RefreshTokenCommandHandler(context, jwtProvider);

        // Act
        var response = await handler.Handle(
            new RefreshTokenCommand { Email = email, RefreshToken = refreshToken },
            CancellationToken.None);

        // Assert
        Assert.NotEmpty(response.Token);
        Assert.NotEmpty(response.RefreshToken);
        Assert.NotEqual(refreshToken, response.RefreshToken);
        Assert.Equal(RefreshTokenHelper.Hash(response.RefreshToken), user.RefreshTokenHash);
    }

    [Fact]
    public async Task RefreshToken_ShouldThrow_WhenTokenWasRevoked()
    {
        // Arrange
        var (context, config) = CreateContextAndConfig();
        var jwtProvider = new JwtProvider(config);

        var refreshToken = RefreshTokenHelper.Generate();
        var email = "revoked@test.com";
        context.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = "hash",
            FirstName = "Revoked",
            LastName = "User",
            Role = UserRole.Admin,
            Active = true,
            RefreshTokenHash = RefreshTokenHelper.Hash(refreshToken),
            RefreshTokenExpiresAtUtc = DateTime.UtcNow.AddDays(1),
            RefreshTokenRevokedAtUtc = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var handler = new RefreshTokenCommandHandler(context, jwtProvider);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            handler.Handle(new RefreshTokenCommand { Email = email, RefreshToken = refreshToken }, CancellationToken.None));
    }

    [Fact]
    public async Task RefreshToken_ShouldRevokeChain_WhenTokenDoesNotMatch()
    {
        // Arrange
        var (context, config) = CreateContextAndConfig();
        var jwtProvider = new JwtProvider(config);

        var email = "reuse@test.com";
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = "hash",
            FirstName = "Reuse",
            LastName = "User",
            Role = UserRole.Admin,
            Active = true,
            RefreshTokenHash = RefreshTokenHelper.Hash(RefreshTokenHelper.Generate()),
            RefreshTokenExpiresAtUtc = DateTime.UtcNow.AddDays(1)
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var handler = new RefreshTokenCommandHandler(context, jwtProvider);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            handler.Handle(new RefreshTokenCommand { Email = email, RefreshToken = "stale-token" }, CancellationToken.None));

        Assert.Null(user.RefreshTokenHash);
        Assert.Null(user.RefreshTokenExpiresAtUtc);
        Assert.NotNull(user.RefreshTokenRevokedAtUtc);
    }

    [Fact]
    public async Task Login_ShouldThrow_WhenPasswordIsIncorrect()
    {
        // Arrange
        var (context, config) = CreateContextAndConfig();
        var hasher = new PasswordHasher();
        var jwtProvider = new JwtProvider(config);
        
        var email = "login@test.com";
        
        context.Users.Add(new User 
        { 
            Id = Guid.NewGuid(), 
            Email = email, 
            PasswordHash = hasher.Hash("CorrectPassword"), 
            FirstName = "Login", 
            LastName = "User" 
        });
        await context.SaveChangesAsync();

        var handler = new LoginCommandHandler(context, hasher, jwtProvider);
        var command = new LoginCommand { Email = email, Password = "WrongPassword" };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => 
            handler.Handle(command, CancellationToken.None));
    }
}
