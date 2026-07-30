namespace SICST.Infrastructure.Storage;

public class SupabaseStorageOptions
{
    public const string SectionName = "SupabaseStorage";

    /// <summary>URL del proyecto Supabase, ej. https://xxxxx.supabase.co</summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>Nombre del bucket de Storage, ej. "documentos".</summary>
    public string Bucket { get; set; } = string.Empty;

    /// <summary>service_role key de Supabase (secreta, solo en variables de entorno).</summary>
    public string ServiceKey { get; set; } = string.Empty;

    /// <summary>True si están las tres piezas necesarias para usar Supabase Storage.</summary>
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Url) &&
        !string.IsNullOrWhiteSpace(Bucket) &&
        !string.IsNullOrWhiteSpace(ServiceKey);
}
