namespace SICST.Application.Common.Interfaces;

/// <summary>
/// Abstracción de almacenamiento de archivos. Permite guardar y leer documentos sin acoplar
/// el código a un disco local (que en Render es efímero y borra los archivos en cada redeploy).
/// Implementaciones: LocalFileStorage (desarrollo, disco) y SupabaseFileStorage (producción).
/// La "key" es la ruta lógica del archivo dentro del almacenamiento (ej. "suppliers/{id}/{archivo}").
/// </summary>
public interface IFileStorage
{
    /// <summary>Guarda el contenido bajo la clave dada y devuelve la clave normalizada.</summary>
    Task<string> SaveAsync(string key, Stream content, string contentType, CancellationToken cancellationToken);

    /// <summary>Abre el archivo para lectura. Devuelve null si no existe.</summary>
    Task<Stream?> OpenReadAsync(string key, CancellationToken cancellationToken);

    Task<bool> ExistsAsync(string key, CancellationToken cancellationToken);

    Task DeleteAsync(string key, CancellationToken cancellationToken);
}
