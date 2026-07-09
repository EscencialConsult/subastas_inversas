namespace SICST.Tests.Arca;

public sealed class RequiresArcaHomologacionFact : FactAttribute
{
    public RequiresArcaHomologacionFact()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ARCA_HOMOLOGACION")))
        {
            Skip = "Requiere conexión a homologación ARCA. " +
                   "Setear variable ARCA_HOMOLOGACION=true y ejecutar con dotnet test --filter ArcaHomologacion";
        }
    }
}
