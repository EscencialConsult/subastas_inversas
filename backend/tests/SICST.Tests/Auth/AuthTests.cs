using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SICST.Application.Auth.Commands;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;
using SICST.Infrastructure.Security;
using SICST.Persistence.Contexts;
using Xunit;

namespace SICST.Tests.Auth;

public class AuthTests
{
    private (ApplicationDbContext context, IConfiguration config) CreateContextAndConfig()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        
        var context = new ApplicationDbContext(options);
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
