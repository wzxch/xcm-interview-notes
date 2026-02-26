# 数据结构
+ Redis原生支持的数据结构有以下9种

> **版本标注说明**：以下各数据结构的版本信息标注了该特性首次引入的 Redis 版本

## 字符串（String）
+ 从 Redis 1.0 开始支持。
+ 简单动态字符串（SDS, Simple Dynamic String）
    - SDS 其实是个结构体概念
        * `len`：记录字符串的当前长度。
        * `free`：记录未使用的空间。
        * `buf`：存储实际的字符数据
    - 可以存储二进制数据
    - 预分配空间，跟静态字符串比，减少了内存碎片。不需要频繁分配内存，性能更高。

## 列表（List）
+ 从 Redis 1.0 开始支持。
+ 使用双向链表或压缩列表（ziplist）存储，具体取决于元素数量和大小。
+ **压缩列表zipList**其实是一个结构体，
    - 一个连续的内存块。
        * zlbytes：4 字节，表示整个 `ziplist` 占用的内存字节数。
        * zltail：4 字节，表示列表最后一个节点的偏移量（方便从尾部快速访问）。
        * zllen：2 字节，表示列表中节点的数量（如果节点数超过 16 位能表示的范围，则需要遍历整个列表来获取节点数）。
        * **entry：列表中的每个节点，存储实际的数据。**
        * zlend：1 字节，固定值 `0xFF`，表示 `ziplist` 的结束。
    - `ziplist` 通过连续内存存储数据，避免了指针的开销，适合存储小型数据。
    - 插入或删除节点时，`ziplist` 会动态调整内存布局，但可能导致连锁更新（cascade update）。
    - 因此：zipList不适合存储大型数据或元素数量较多的列表。

## 集合（Set）
+ 从 Redis 1.0 开始支持。
+ 通过`set` 在Redis中通过哈希表存储，哈希表的键是 `set` 的元素，值为value
+ 当哈希表的负载因子（元素数量 / 哈希表大小）超过阈值时，Redis 会进行扩容，通常将哈希表大小翻倍。
+ Redis 采用渐进式扩容，逐步将旧哈希表的元素迁移到新哈希表，避免一次性迁移导致长时间阻塞。
    - 将迁移操作分散到多次请求中，每次只迁移一部分数据。
    - 在迁移过程中，插入、删除等操作可能需要访问新旧两个哈希表，导致耗时略有增加。
    - **Rehash 期间的查找逻辑**：渐进式 rehash 期间，Redis 会同时维护两个哈希表，先查新表，如果没找到再查旧表，确保扩容期间查找性能不会下降。

## 有序集合（Sorted Set）
+ 从 Redis 1.2 开始支持。
+ 用跳跃表（Skip List）和哈希表结合实现的，既能快速查找元素，又能保持元素有序。
    - 跳表实现简单，时间复杂度和红黑树相同。而且跳表的范围查询实现起来非常高效。
    - **为什么 Redis 用跳表而不是 B+树？**
        * Redis 是内存数据库，不需要考虑磁盘 I/O 和页对齐
        * 跳表实现简单，代码量少，bug 少，易优化
        * 跳表通过 level 指针可快速定位范围起点，范围查询效率高
    - **但是数据库索引一般用B+树，不用跳表，因为B+树的叶子节点对磁盘存储较为友好**。
        * B+树的结构经过精心设计，能够充分利用磁盘的顺序读写特性。每个节点（尤其是叶子节点）存储多个键值对，并且这些键值对在物理上是连续存储的。
        * 当进行范围查询或顺序访问时，B+树可以一次性加载一个磁盘块（page）中的多个键值对，从而减少磁盘I/O次数。

| 维度 | 跳表 | B+树 |
|:---|:---|:---|
| 实现复杂度 | 简单，易维护 | 复杂，需处理页分裂/合并 |
| 内存访问 | 节点分散，缓存命中率一般 | 页对齐，顺序访问友好 |
| 适用场景 | **内存数据库** | **磁盘数据库** |

## 哈希（Map）
+ 从 Redis 2.0 开始支持。
+ 应用场景：存储对象、用户属性等。
+ Redis 的哈希是用哈希表实现的，类似于 Java 中的 `HashMap`。

## 位图（BitMap）
+ 从 Redis 2.2 开始支持。
+ 应用场景：用户签到、活跃用户统计等。
+ 位图实际上是字符串的扩展，Redis 通过字符串的位操作来实现位图功能。

## 地理空间（Geospatial）
+ 从 Redis 3.2 开始支持。
+ 地理位置相关的应用，如附近的人、地点搜索等。
+ Redis 的地理空间数据是通过有序集合（Sorted Set）实现的，使用 GeoHash 算法将经纬度编码为分数。

## HyperLogLog
+ 从 Redis 2.8.9 开始支持。
+ 大数据量下的基数统计（如 UV 统计）。
+ HyperLogLog 是一种概率数据结构，用于估计集合的基数，占用空间非常小。

## 流（Stream）
+ 从 Redis 5.0 开始支持。
+ 应用场景：消息队列、日志收集等。
+ Redis 的流是一个持久化的、可追加的日志数据结构，内部实现类似于链表。

# 数据持久化方案
## RDB（Redis Database）
### 工作流程
RDB是Redis的默认持久化方式，通过生成数据快照来保存某一时刻的数据。

**工作流程：**

+ 创建快照：Redis会定期将内存中的数据保存到磁盘上的RDB文件中。
+ 触发条件：可以通过配置`save`指令设置触发条件，如`save 900 1`表示在900秒内至少有一个键被修改时触发快照。
+ 手动触发：使用`SAVE`或`BGSAVE`命令手动创建快照，`SAVE`会阻塞服务器，而`BGSAVE`在后台异步执行。

**优点：**

+ 性能高：生成快照时对性能影响较小。
+ 文件紧凑：RDB文件是二进制格式，适合备份和恢复。
+ 恢复速度快：恢复数据时比AOF更快。

**缺点：**

+ 数据丢失风险：如果Redis崩溃，最后一次快照之后的数据会丢失。
+ 频繁写入时效率低：在数据频繁修改的场景下，频繁生成快照会影响性能。

### BGSAVE命令
#### Fork进程
+ 当执行 `BGSAVE` 时，Redis 主进程会调用 `fork()` 系统调用，创建一个子进程。
+ 子进程和主进程共享相同的内存页，但这些内存页被标记为写时复制。
+ 如果主进程或子进程尝试修改共享的内存页，操作系统会为该内存页创建一个副本，确保修改不会影响另一方（Copy-On-Write）。

#### 子进程生成 RDB 文件：
+ 子进程遍历内存中的数据，将其序列化为 RDB 格式，并写入磁盘。
+ 由于子进程是主进程的副本，它看到的数据是 `fork()` 调用时的数据快照。
+ 主进程继续处理客户端请求，对数据的修改会触发写时复制，但不会影响子进程的工作。
+ 子进程完成 RDB 文件生成后，向主进程发送信号，通知其任务完成。
    - 子进程退出。
+ 主进程收到子进程的信号后，更新持久化状态，并记录日志

## AOF（Append-Only File）
AOF通过记录所有写操作命令来持久化数据，重启时通过重新执行这些命令来恢复数据。

**工作流程：**

+ 记录命令：每个写操作都会被追加到AOF文件的末尾。
+ 文件重写：为防止AOF文件过大，Redis会定期重写AOF文件，移除冗余命令。
+ 同步策略：可通过`appendfsync`配置同步策略：
    - `always`：每次写操作都同步到磁盘，数据最安全，但性能最低。
    - `everysec`：每秒同步一次，性能和安全性平衡。
    - `no`：由操作系统决定同步时机，性能最好，但数据丢失风险最高。

**优点：**

+ 数据安全性高：通过不同的同步策略，可以最大限度减少数据丢失。
+ 可读性强：AOF文件是文本格式，便于理解和修复。

**缺点：**

+ 文件较大：AOF文件通常比RDB文件大。
+ 恢复速度慢：恢复数据时需要重新执行所有命令，速度较慢。

# 集群方案
## Redis Cluster
Redis Cluster 在 Redis 3.0 版本（2015年）中引入。

### 数据分片
+ **哈希槽（Hash Slot）：**Redis Cluster将数据划分为16384个哈希槽，每个键通过CRC16算法计算后映射到一个槽。
+ **槽分配：**每个节点负责一部分槽，集群初始化时槽会被均匀分配。
+ 采用**分布式元数据管理（Gossip协议）**的方式处理槽和节点的关系，每个节点都维护一份完整的集群状态信息。

#### 新加入节点
+ 新节点刚加入时，不分配任何槽。`CLUSTER MEET`
+ 通过 `CLUSTER SETSLOT` 命令，管理员可以将部分槽从现有节点迁移到新节点。迁移过程是逐步进行的，每次迁移一个槽。
+ 槽迁移完成后，集群会通过 Gossip 协议更新所有节点的元数据，确保客户端能够正确路由请求。

注意，如果新增节点是主节点，容易出现单点故障，此时需要给新节点分配从节点（或者先分配）。`CLUSTER REPLICATE` 命令将一个或多个从节点分配给它

### 节点角色
+ **主节点（Master）：**负责处理读写请求，并存储分配的槽数据。
+ **从节点（Slave）：**复制主节点的数据，提供高可用性，主节点故障时可升级为主节点。

#### 故障检测
+ Redis Cluster 中的每个节点A会定期向其他节点发送 `PING` 消息，如果某个节点B没有回复，表明该节点可能出现问题，节点A会将节点B标记成主观下线（PFAIL）。
+ 节点A通过Gossip协议将节点B的（PFAIL）广播给集群中其它节点
+ 如果集群中大部分节点都认为B主观下线时，集群会将节点标记成客观下线（FAIL)
+ 一旦某个节点被标注成客观下线，集群会触发故障转移，将主节点对应的从节点提升为主节点

#### 故障转移
+ 从节点会发起选举，其他主节点会投票决定哪个从节点升级为新的主节点。
+ 选举基于Raft 算法的变种，确保只有一个从节点会被提升为主节点。
+ 新的主节点会接管故障主节点负责的所有槽，并开始处理客户端请求。

### 客户端路由
#### （1）、Redis Cluster 的客户端路由机制如下：
+ 客户端计算哈希槽：客户端根据键（Key）使用 CRC16 算法计算哈希值，然后对 16384 取模，得到对应的哈希槽。
+ 槽与节点的映射：客户端会缓存一份槽与节点的映射关系（可以通过 `CLUSTER SLOTS` 命令获取）。
+ 请求发送：
    - 如果客户端缓存的映射关系正确，请求会直接发送到对应的节点。
    - 如果客户端缓存的映射关系过期（例如槽迁移后），目标节点会返回 `MOVED` 错误，并告知正确的节点地址。客户端更新缓存后重新发送请求。
    - 如果槽正在迁移中，目标节点会返回 `ASK` 错误，客户端需要将请求发送到迁移的目标节点。

总结：客户端负责计算哈希槽，并通过缓存和重定向机制实现请求路由。

#### （2）、Lua 脚本的执行限制
<font style="color:rgba(0, 0, 0, 0.85) !important;background-color:rgb(249, 250, 251);">Redis Cluster 对 Lua 脚本有严格限制：</font>**<font style="color:rgb(0, 0, 0) !important;background-color:rgb(249, 250, 251);"></font>**

+ **<font style="color:rgb(0, 0, 0) !important;background-color:rgb(249, 250, 251);">所有 Key 必须属于同一哈希槽</font>**<font style="color:rgba(0, 0, 0, 0.85) !important;background-color:rgb(249, 250, 251);">：否则会抛出</font><font style="color:rgba(0, 0, 0, 0.85) !important;background-color:rgb(249, 250, 251);"> </font>`<font style="color:rgb(0, 0, 0);background-color:rgb(249, 250, 251);">CROSSSLOT Keys in request don't hash to the same slot</font>`<font style="color:rgba(0, 0, 0, 0.85) !important;background-color:rgb(249, 250, 251);"> </font><font style="color:rgba(0, 0, 0, 0.85) !important;background-color:rgb(249, 250, 251);">错误。</font>
+ **<font style="color:rgb(0, 0, 0) !important;background-color:rgb(249, 250, 251);">脚本原子性</font>**<font style="color:rgba(0, 0, 0, 0.85) !important;background-color:rgb(249, 250, 251);">：只有当所有 Key 在同一节点时，脚本才能保证原子性执行。</font>

#### <font style="color:rgb(0, 0, 0) !important;background-color:rgb(249, 250, 251);">（3）、确保多 Key 在同一节点的方法</font>
<font style="color:rgba(0, 0, 0, 0.85) !important;background-color:rgb(249, 250, 251);">为了让 LRU 脚本中的 </font>`<font style="color:rgba(0, 0, 0, 0.85) !important;background-color:rgb(249, 250, 251);">cacheKey</font>`<font style="color:rgba(0, 0, 0, 0.85) !important;background-color:rgb(249, 250, 251);"> 和 </font>`<font style="color:rgba(0, 0, 0, 0.85) !important;background-color:rgb(249, 250, 251);">accessTimeKey</font>`<font style="color:rgba(0, 0, 0, 0.85) !important;background-color:rgb(249, 250, 251);"> 被路由到同一节点，需要使用 </font>**<font style="color:rgb(0, 0, 0) !important;background-color:rgb(249, 250, 251);">哈希标签（Hash Tag）</font>**<font style="color:rgba(0, 0, 0, 0.85) !important;background-color:rgb(249, 250, 251);">：</font>

<font style="color:rgba(0, 0, 0, 0.85) !important;background-color:rgb(249, 250, 251);">在 Key 中使用 </font>`<font style="color:rgba(0, 0, 0, 0.85) !important;background-color:rgb(249, 250, 251);">{}</font>`<font style="color:rgba(0, 0, 0, 0.85) !important;background-color:rgb(249, 250, 251);"> 包裹的部分作为哈希计算的依据。例如：</font>

```plain
user:{123}:profile  和  user:{123}:settings
```

<font style="color:rgba(0, 0, 0, 0.85);background-color:rgb(249, 250, 251);">这两个 Key 的哈希槽仅由 </font>`<font style="color:rgba(0, 0, 0, 0.85);">{123}</font>`<font style="color:rgba(0, 0, 0, 0.85);background-color:rgb(249, 250, 251);"> 决定，因此会被分配到同一节点。</font>

### 主从复制
+ Redis **默认采用异步复制**，但可通过 `WAIT` 命令实现同步语义（Redis 3.0+）
+ 同步复制会显著增加写操作的延迟，影响性能，适用于对一致性要求极高的场景

```redis
WAIT 1 5000  # 等待至少1个从节点确认，最多等待5000ms
```

+ Redis 目前不支持严格的同步复制（即主节点等待从节点确认后再返回）。这是因为同步复制会显著增加写操作的延迟，影响性能。

#### 工作流程
+ 从节点配置：在从节点的配置文件或通过`SLAVEOF`命令指定主节点的IP和端口。
+ 连接请求：从节点向主节点发送连接请求。
+ 全量同步：
    - RDB文件生成：主节点执行`BGSAVE`生成RDB快照文件。
    - 发送RDB文件：主节点将RDB文件发送给从节点。
    - 加载RDB文件：从节点接收并加载RDB文件，完成数据同步。
+ 部分同步：
    - 复制偏移量：主从节点各自维护一个复制偏移量。
    - 复制积压缓冲区：主节点将写命令存入缓冲区。
    - 发送缺失数据：如果从节点的偏移量在缓冲区内，主节点发送缺失的命令；否则，进行全量同步。
+ 心跳检测
    - PING/PONG：主从节点通过`PING`和`PONG`命令检测连接状态。
    - 断开重连：如果连接断开，从节点会尝试重新连接并继续同步

#### 为什么部分同步不用AOF文件
+ AOF是异步同步的，根据AOF文件增量同步会导致数据滞后。内存缓冲区速度更快
+ 内存缓冲区实现简单，文件缓冲实现复杂，且无法直接支持部分同步。

## Redis Sentinel （哨兵）
### 故障检测&恢复
+ 心跳检测：哨兵节点定期向主节点和从节点发送PING命令，检测它们是否在线。
+ 主观下线（SDOWN）：如果一个哨兵节点认为某个主节点不可用，它会将其标记为“主观下线”。
+ 客观下线（ODOWN）：当多个哨兵节点（通常是多数）都认为主节点不可用时，主节点会被标记为“客观下线”。
+ 选举领导者：在客观下线后，哨兵节点会通过选举机制**（RAFT算法）**选出一个领导者哨兵来执行故障转移操作。
+ 故障转移：领导者哨兵会选择一个合适的从节点，将其提升为新的主节点，并通知其他从节点复制新的主节点。选举完成后，领导者角色消失，所有 Sentinel 节点恢复平等状态。

### 几个注意点
+ Sentinel节点之间通过Gossip协议确保所有节点对系统有一致的状态视图
+ Sentinel节点无状态，不存储Redis数据，无主从关系（只有选举是会有短暂主从）
+ 通常部署3-5个Sentinel节点，确保容错能力

### 在Sentinel架构下如何横向扩展
#### （1）客户端分片（不靠谱，需要有配置中心维护节点&槽的关系）
+ 分片逻辑：在客户端实现分片逻辑，将数据分散到多个Redis实例中。可以使用一致性哈希算法或其他分片算法。
+ 多个主从集群：部署多个独立的主从复制集群，每个集群负责一部分数据。
+ 客户端路由：客户端根据分片逻辑将请求路由到相应的Redis实例。

#### （2）代理分片（Proxy-based Sharding）
使用代理层来实现数据分片，代理层负责将客户端请求路由到正确的Redis实例。常见的代理工具包括：

+ Twemproxy（Nutcracker）：Twitter开源的轻量级代理，支持分片和负载均衡。
+ Codis：一个分布式Redis解决方案，提供了分片、数据迁移和集群管理功能。

## 两种架构总结
+ Sentinel 和 Cluster 都是 Redis 官方方案，分别针对高可用性和分布式存储。
+ 架构差异 源于它们的设计目标和使用场景不同。
    - `Redis Cluster`支持数据分片和自动故障转移
    - `Redis Sentinel`主打高可用
+ Redis Cluster通过**Gossip协议**实现信息高效，去中心化的传播，省去了MQ系统中的NameServer角色。
+ MQ系统不采用Gossip协议而采用NameServer作为注册中心，可能有以下几个方面的原因
    - MQ的系统拓扑关系相对复杂，集中管理可以简化系统设计
    - MQ系统有消息顺序性和一致性要求较高，NameServer处理集群状态变更会更迅速

## 3.4、LDC架构-跨机房复制
> TODO: 待补充跨机房复制的架构设计和实现细节

---

# 缓存一致性（补充章节）

## 缓存模式

### 1. Cache-Aside（旁路缓存）
**流程：**
- **读**：先查缓存，命中返回；未命中查数据库，写入缓存后返回
- **写**：先更新数据库，再删除缓存（**不是更新缓存**）

**为什么写操作是删除而不是更新缓存？**
- 避免并发写导致缓存与数据库不一致
- 删除缓存简单，下次读取时自然从数据库加载最新值

### 2. Read-Through（读穿透）
- 应用只与缓存交互
- 缓存未命中时，由缓存层自动从数据库加载
- 对应用透明，但实现复杂

### 3. Write-Through（写穿透）
- 应用写入缓存，缓存同步写入数据库
- 数据一致性高，但写性能较低

### 4. Write-Behind（异步写）
- 应用写入缓存后立即返回
- 缓存异步批量写入数据库
- 性能最高，但数据丢失风险大

## 缓存与数据库一致性问题

### 问题场景
1. **先删缓存，再更新数据库**
   - 线程A删除缓存 → 线程B读缓存未命中 → 线程B读数据库旧值 → 线程A更新数据库 → 线程B写入缓存旧值
   - **结果：缓存与数据库不一致**

2. **先更新数据库，再删缓存（推荐）**
   - 线程A更新数据库 → 线程B读缓存命中旧值（短暂不一致）→ 线程A删除缓存 → 下次读取加载新值
   - **结果：短暂不一致，但最终一致**

### 解决方案
1. **延迟双删**：更新数据库后，先删缓存，延迟一段时间（如500ms）再删一次
2. **消息队列**：数据库变更后发送消息，异步删除缓存
3. **Canal 订阅 Binlog**：通过 Canal 监听 MySQL binlog，异步更新/删除缓存

---



# 过期策略
+ 定期删除：Redis每隔100ms随机检查一些key，删除其中已过期的
+ 惰性删除：当访问一个key时，检查它是否过期，如果过期就删除

## 内存淘汰策略(当内存不足时)
Redis提供了8种内存淘汰策略，通过`maxmemory-policy`配置：

1. noeviction (默认策略)：不淘汰，写操作返回错误
2. allkeys-lru：从所有key中使用LRU算法淘汰
3. volatile-lru：从设置了过期时间的key中使用LRU算法淘汰
4. allkeys-random：从所有key中随机淘汰
5. volatile-random：从设置了过期时间的key中随机淘汰
6. volatile-ttl：淘汰过期时间最近的key(剩余TTL最短)
7. allkeys-lfu (Redis 4.0+)：从所有key中使用LFU算法淘汰
8. volatile-lfu (Redis 4.0+)：从设置了过期时间的key中使用LFU算法淘汰

# 事务
## 原生事务
Redis 事务通过 `MULTI`、`EXEC`、`DISCARD` 和 `WATCH` 等命令实现

| 方法 | 对应Redis命令 | 说明 |
| :---: | :---: | :---: |
| `multi()` | MULTI | 开始事务 |
| `exec()` | EXEC | 执行事务 |
| `discard()` | DISCARD | 取消事务 |
| `watch(String... keys)` | WATCH | 监视一个或多个 key，如果在事务执行前这些 key 被其他命令改动，则事务将被打断 |
| `unwatch()` | UNWATCH | 取消监视 |
| `set(String key, String value)` | SET | 在事务中设置值 |
| `get(String key)` | GET | 在事务中获取值 |
| `incr(String key)` | INCR | 在事务中自增 |
| `del(String... keys)` | DEL | 在事务中删除键 |
| `zadd(String key, double score, String member)` | ZADD | 在事务中添加ZSET成员 |
| `hset(String key, String field, String value)` | HSET | 在事务中设置哈希字段 |


+ <font style="color:#DF2A3F;">用watch+multi实现乐观锁机制。</font>

```java
try (Jedis jedis = jedisPool.getResource()) {
    jedis.watch("balance");  // 监视balance键

    int balance = Integer.parseInt(jedis.get("balance"));
    if (balance < 100) {
        jedis.unwatch();  // 余额不足，取消监视
        return false;
    }

    Transaction tx = jedis.multi();  // 开始事务
    tx.decrBy("balance", 100);
    tx.incrBy("debt", 100);
    List<Object> results = tx.exec();  // 执行事务

    if (results == null) {
        // 表示WATCH的key被修改，事务未执行
        return false;
    }
    return true;
}
```

特点：

+ 最基础的原子性保证方式
+ <font style="color:#DF2A3F;">命令按顺序执行，不会被其他客户端命令打断</font>
+ <font style="color:#DF2A3F;">但不支持回滚（部分失败会继续执行后续命令）</font>

## Lua脚本（首选方案）
**特点：**

+ <font style="color:#DF2A3F;">真正的原子性（脚本作为一个整体执行）</font>
+ <font style="color:#DF2A3F;">减少网络开销（多个操作一次发送）</font>
+ 支持复杂逻辑
+ 执行期间完全阻塞其他命令

# 为什么快
+ 基于内存：
    - 内存访问速度快，Redis 将数据存储在内存中，避免了磁盘 I/O 的开销。
    - Redis 通过编码优化和压缩技术，减少内存使用。
+ 数据结构优化：Redis 使用高效的数据结构，这些结构在内存中操作非常迅速。
+ 单线程执行命令：
    - 单线程模型避免了多线程的上下文切换和竞争条件，减少了开销。
    - 单线程确保了命令的原子性，简化了并发控制。
    - I/O 多路复用：Redis 使用 epoll、kqueue 等机制，单线程可以高效处理大量并发连接。
+ Redis 6.0 引入了多线程，但仅限于网络 I/O 和部分后台任务（如持久化）。
    - 命令执行依然是单线程的，保持了原子性。
    - 多线程的引入进一步提升了 Redis 在高并发场景下的性能。
+ Redis Cluster：Redis Cluster 支持分布式存储和自动分片，提升了扩展性和高可用性。
+ 管道技术：Redis 支持管道技术，客户端可以一次性发送多个命令，减少通信开销。
+ Lua 脚本：Redis 支持 Lua 脚本，减少了多次请求的开销。

