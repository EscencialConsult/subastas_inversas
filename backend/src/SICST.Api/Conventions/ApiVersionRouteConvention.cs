using Microsoft.AspNetCore.Mvc.ApplicationModels;

namespace SICST.Api.Conventions;

public class ApiVersionRouteConvention : IApplicationModelConvention
{
    public void Apply(ApplicationModel application)
    {
        foreach (var controller in application.Controllers)
        {
            // Apply version prefix to controller-level routes
            foreach (var selector in controller.Selectors)
            {
                if (selector.AttributeRouteModel != null && selector.AttributeRouteModel.Template != null)
                {
                    var template = selector.AttributeRouteModel.Template;

                    if (template.StartsWith("api/v1/") || template.StartsWith("/api/v1/") || template.StartsWith("~/api/v1/"))
                    {
                        continue;
                    }

                    if (template.StartsWith("api/"))
                    {
                        selector.AttributeRouteModel.Template = "api/v1/" + template.Substring(4);
                    }
                    else if (template.StartsWith("/api/"))
                    {
                        selector.AttributeRouteModel.Template = "/api/v1/" + template.Substring(5);
                    }
                    else if (template.StartsWith("~/api/"))
                    {
                        selector.AttributeRouteModel.Template = "~/api/v1/" + template.Substring(6);
                    }
                }
            }

            // Apply version prefix to action-level routes
            foreach (var action in controller.Actions)
            {
                foreach (var selector in action.Selectors)
                {
                    if (selector.AttributeRouteModel != null && selector.AttributeRouteModel.Template != null)
                    {
                        var template = selector.AttributeRouteModel.Template;

                        if (template.StartsWith("api/v1/") || template.StartsWith("/api/v1/") || template.StartsWith("~/api/v1/"))
                        {
                            continue;
                        }

                        if (template.StartsWith("api/"))
                        {
                            selector.AttributeRouteModel.Template = "api/v1/" + template.Substring(4);
                        }
                        else if (template.StartsWith("/api/"))
                        {
                            selector.AttributeRouteModel.Template = "/api/v1/" + template.Substring(5);
                        }
                        else if (template.StartsWith("~/api/"))
                        {
                            selector.AttributeRouteModel.Template = "~/api/v1/" + template.Substring(6);
                        }
                    }
                }
            }
        }
    }
}
