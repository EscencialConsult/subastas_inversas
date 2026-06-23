using Microsoft.AspNetCore.SignalR;

namespace SICST.Api.Hubs;

public class AuctionHub : Hub
{
    public async Task JoinAuction(Guid auctionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(auctionId));
    }

    public async Task LeaveAuction(Guid auctionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(auctionId));
    }

    public static string GroupName(Guid auctionId) => $"auction:{auctionId}";
}
