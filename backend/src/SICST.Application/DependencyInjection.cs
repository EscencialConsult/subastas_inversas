using Microsoft.Extensions.DependencyInjection;
using MediatR;
using SICST.Application.Common.Behaviors;
using SICST.Application.Common.Validation;

namespace SICST.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(PerformanceBehavior<,>));
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(TenantAuthorizationBehavior<,>));
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

        var validatorInterface = typeof(IRequestValidator<>);
        var validators = typeof(DependencyInjection).Assembly
            .GetTypes()
            .Where(type => !type.IsAbstract && !type.IsInterface)
            .SelectMany(type => type.GetInterfaces()
                .Where(i => i.IsGenericType && i.GetGenericTypeDefinition() == validatorInterface)
                .Select(i => new { Service = i, Implementation = type }));

        foreach (var validator in validators)
        {
            services.AddTransient(validator.Service, validator.Implementation);
        }

        return services;
    }
}
