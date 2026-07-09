using System.Reflection;
using System.Xml.Linq;
using SICST.Infrastructure.Arca;

namespace SICST.Tests.Arca;

public class CmsGeneratorTests
{
    [Fact]
    public void BuildLoginTicketRequestXml_GeneratesWsaaSchemaCompatibleTra()
    {
        var method = typeof(CmsGenerator).GetMethod(
            "BuildLoginTicketRequestXml",
            BindingFlags.NonPublic | BindingFlags.Static);

        Assert.NotNull(method);

        var xml = Assert.IsType<string>(method.Invoke(null, ["ws_sr_padron_a13"]));
        var doc = XDocument.Parse(xml);
        var root = doc.Root;

        Assert.NotNull(root);
        Assert.Equal("loginTicketRequest", root.Name.LocalName);
        Assert.Equal("1.0", root.Attribute("version")?.Value);

        var header = root.Element("header");
        Assert.NotNull(header);
        Assert.NotNull(header.Element("uniqueId"));
        var generationTimeElement = header.Element("generationTime");
        var expirationTimeElement = header.Element("expirationTime");
        Assert.NotNull(generationTimeElement);
        Assert.NotNull(expirationTimeElement);
        var generationTime = DateTimeOffset.Parse(generationTimeElement.Value);
        var expirationTime = DateTimeOffset.Parse(expirationTimeElement.Value);
        Assert.Null(header.Element("service"));

        Assert.Equal(TimeSpan.FromHours(-3), generationTime.Offset);
        Assert.Equal(TimeSpan.FromHours(-3), expirationTime.Offset);
        Assert.True(generationTime <= DateTimeOffset.UtcNow);
        Assert.True(expirationTime > generationTime);
        Assert.Equal("ws_sr_padron_a13", root.Element("service")?.Value);
    }
}
