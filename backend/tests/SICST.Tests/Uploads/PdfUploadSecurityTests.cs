using System.Text;
using SICST.Api.Services;
using Xunit;

namespace SICST.Tests.Uploads;

public class PdfUploadSecurityTests
{
    [Fact]
    public void HasPdfMagicBytes_True_ForRealPdfHeader()
    {
        var content = Encoding.ASCII.GetBytes("%PDF-1.7\nresto del archivo...");
        Assert.True(PdfUploadSecurity.HasPdfMagicBytes(content));
    }

    [Fact]
    public void HasPdfMagicBytes_False_ForNonPdf()
    {
        // Un ZIP (o cualquier otro archivo) renombrado a .pdf no pasa.
        var content = Encoding.ASCII.GetBytes("PK contenido que no es pdf");
        Assert.False(PdfUploadSecurity.HasPdfMagicBytes(content));
    }

    [Fact]
    public void HasPdfMagicBytes_False_ForTooShort()
    {
        Assert.False(PdfUploadSecurity.HasPdfMagicBytes([0x25, 0x50]));
    }
}
