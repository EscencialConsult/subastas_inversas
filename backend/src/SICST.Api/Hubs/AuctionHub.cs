using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SICST.Api.Hubs;

[Authorize]
public class AuctionHub : Hub
{
    public async Task JoinAuction(Guid auctionId)
    {
        await JoinAuctionRoom(auctionId);
    }

    public async Task LeaveAuction(Guid auctionId)
    {
        await LeaveAuctionRoom(auctionId);
    }

    public async Task JoinAuctionRoom(Guid auctionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(auctionId));
    }

    public async Task LeaveAuctionRoom(Guid auctionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(auctionId));
    }

    public static string GroupName(Guid auctionId) => $"auction:{auctionId}";
}
