using System.Text.Json;
using SICST.Application.Common.Interfaces;
using SICST.Application.Public.DTOs;
using StackExchange.Redis;

namespace SICST.Infrastructure.Auctions;

public class RedisPublicAuctionSnapshotCache : IPublicAuctionSnapshotCache
{
    private static readonly TimeSpan SnapshotExpiry = TimeSpan.FromHours(24);
    private readonly IConnectionMultiplexer _redis;

    public RedisPublicAuctionSnapshotCache(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    public async Task SetAsync(PublicAuctionSnapshotDto snapshot, CancellationToken cancellationToken)
    {
        var database = _redis.GetDatabase();
        await database.StringSetAsync(Key(snapshot.Id), JsonSerializer.Serialize(snapshot), SnapshotExpiry);
    }

    public async Task<PublicAuctionSnapshotDto?> GetAsync(Guid auctionId, CancellationToken cancellationToken)
    {
        var database = _redis.GetDatabase();
        var value = await database.StringGetAsync(Key(auctionId));
        return value.HasValue
            ? JsonSerializer.Deserialize<PublicAuctionSnapshotDto>((string)value!)
            : null;
    }

    public async Task RemoveAsync(Guid auctionId, CancellationToken cancellationToken)
    {
        var database = _redis.GetDatabase();
        await database.KeyDeleteAsync(Key(auctionId));
    }

    private static string Key(Guid auctionId) => $"auction:{auctionId}:public-snapshot";
}
