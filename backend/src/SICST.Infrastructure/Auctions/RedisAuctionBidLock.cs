using StackExchange.Redis;
using SICST.Application.Common.Interfaces;

namespace SICST.Infrastructure.Auctions;

public class RedisAuctionBidLock : IAuctionBidLock
{
    private static readonly TimeSpan LockExpiry = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan RetryDelay = TimeSpan.FromMilliseconds(50);
    private const string ReleaseScript =
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

    private readonly IConnectionMultiplexer _redis;

    public RedisAuctionBidLock(IConnectionMultiplexer redis)
    {
        _redis = redis;
    }

    public async Task<IDisposable> AcquireAsync(Guid auctionId, CancellationToken cancellationToken)
    {
        var database = _redis.GetDatabase();
        var key = $"auction:{auctionId}:bid-lock";
        var token = Guid.NewGuid().ToString("N");

        while (!cancellationToken.IsCancellationRequested)
        {
            if (await database.StringSetAsync(key, token, LockExpiry, When.NotExists))
            {
                return new Releaser(database, key, token);
            }

            await Task.Delay(RetryDelay, cancellationToken);
        }

        throw new OperationCanceledException(cancellationToken);
    }

    private sealed class Releaser : IDisposable
    {
        private readonly IDatabase _database;
        private readonly string _key;
        private readonly string _token;
        private bool _disposed;

        public Releaser(IDatabase database, string key, string token)
        {
            _database = database;
            _key = key;
            _token = token;
        }

        public void Dispose()
        {
            if (_disposed) return;
            _database.ScriptEvaluate(ReleaseScript, [new RedisKey(_key)], [new RedisValue(_token)]);
            _disposed = true;
        }
    }
}
