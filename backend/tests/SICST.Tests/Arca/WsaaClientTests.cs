using System.Reflection;
using SICST.Infrastructure.Arca;

namespace SICST.Tests.Arca;

public class WsaaClientTests
{
    [Fact]
    public void ParseLoginResponse_ReadsXmlLoginCmsReturn()
    {
        var method = typeof(WsaaClient).GetMethod(
            "ParseLoginResponse",
            BindingFlags.NonPublic | BindingFlags.Static);

        Assert.NotNull(method);

        const string soapXml = """
            <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
              <soapenv:Body>
                <loginCmsResponse xmlns="http://wsaa.view.sua.dvadac.desein.afip.gov.ar">
                  <loginCmsReturn><![CDATA[
                    <loginTicketResponse version="1.0">
                      <credentials>
                        <token>test-token</token>
                        <sign>test-sign</sign>
                      </credentials>
                    </loginTicketResponse>
                  ]]></loginCmsReturn>
                </loginCmsResponse>
              </soapenv:Body>
            </soapenv:Envelope>
            """;

        var result = Assert.IsAssignableFrom<ValueTuple<string, string>>(method.Invoke(null, [soapXml]));

        Assert.Equal("test-token", result.Item1);
        Assert.Equal("test-sign", result.Item2);
    }
}
