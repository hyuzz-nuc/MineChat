/**
 * MineChat 种子数据脚本
 * 用途：开发阶段快速填充测试数据
 * 运行：pnpm db:seed
 */
import { PrismaClient, UserStatus, RoomType, MemberRole, MessageType, MsgStatus, FriendStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 开始播种种子数据...');

  // ────────── 清理旧数据 ──────────
  await prisma.fileUpload.deleteMany();
  await prisma.message.deleteMany();
  await prisma.group.deleteMany();
  await prisma.roomMember.deleteMany();
  await prisma.room.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.user.deleteMany();
  console.log('  ✅ 旧数据已清理');

  // ────────── 创建测试用户 ──────────
  const passwordHash = await bcrypt.hash('Test1234!', SALT_ROUNDS);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: 'alice',
        email: 'alice@minechat.dev',
        passwordHash,
        nickname: '爱丽丝',
        avatar: null,
        bio: '探索数字世界的冒险者',
        status: UserStatus.ONLINE,
      },
    }),
    prisma.user.create({
      data: {
        username: 'bob',
        email: 'bob@minechat.dev',
        passwordHash,
        nickname: '鲍勃',
        avatar: null,
        bio: '代码与咖啡',
        status: UserStatus.ONLINE,
      },
    }),
    prisma.user.create({
      data: {
        username: 'charlie',
        email: 'charlie@minechat.dev',
        passwordHash,
        nickname: '查理',
        avatar: null,
        bio: '音乐是灵魂的语言',
        status: UserStatus.OFFLINE,
      },
    }),
    prisma.user.create({
      data: {
        username: 'diana',
        email: 'diana@minechat.dev',
        passwordHash,
        nickname: '戴安娜',
        avatar: null,
        bio: '设计改变世界',
        status: UserStatus.BUSY,
      },
    }),
  ]);
  console.log(`  ✅ 创建 ${users.length} 个测试用户`);

  const [alice, bob, charlie, diana] = users;

  // ────────── 创建好友关系 ──────────
  await prisma.friendship.createMany({
    data: [
      { requesterId: alice.id, addresseeId: bob.id, status: FriendStatus.ACCEPTED },
      { requesterId: alice.id, addresseeId: charlie.id, status: FriendStatus.ACCEPTED },
      { requesterId: bob.id, addresseeId: diana.id, status: FriendStatus.PENDING },
      { requesterId: charlie.id, addresseeId: alice.id, status: FriendStatus.ACCEPTED },
    ],
  });
  console.log('  ✅ 创建好友关系');

  // ────────── 创建私聊房间 ──────────
  const dmRoom1 = await prisma.room.create({
    data: {
      type: RoomType.DIRECT,
      lastMsgAt: new Date(),
      members: {
        create: [
          { userId: alice.id, role: MemberRole.MEMBER },
          { userId: bob.id, role: MemberRole.MEMBER },
        ],
      },
    },
  });

  const dmRoom2 = await prisma.room.create({
    data: {
      type: RoomType.DIRECT,
      lastMsgAt: new Date(),
      members: {
        create: [
          { userId: alice.id, role: MemberRole.MEMBER },
          { userId: charlie.id, role: MemberRole.MEMBER },
        ],
      },
    },
  });
  console.log('  ✅ 创建私聊房间');

  // ────────── 创建群聊房间 ──────────
  const groupRoom = await prisma.room.create({
    data: {
      type: RoomType.GROUP,
      name: '深夜食堂',
      avatar: null,
      lastMsgAt: new Date(),
      members: {
        create: [
          { userId: alice.id, role: MemberRole.OWNER },
          { userId: bob.id, role: MemberRole.ADMIN },
          { userId: charlie.id, role: MemberRole.MEMBER },
          { userId: diana.id, role: MemberRole.MEMBER },
        ],
      },
    },
  });

  // 群组扩展信息
  await prisma.group.create({
    data: {
      roomId: groupRoom.id,
      ownerId: alice.id,
      description: '深夜闲聊，分享生活',
      announcement: '欢迎来到深夜食堂，请文明聊天 🍜',
    },
  });
  console.log('  ✅ 创建群聊房间');

  // ────────── 创建测试消息 ──────────
  await prisma.message.createMany({
    data: [
      // 私聊1：alice & bob
      {
        roomId: dmRoom1.id,
        senderId: alice.id,
        type: MessageType.TEXT,
        content: '嘿，最近在忙什么？',
        status: MsgStatus.READ,
      },
      {
        roomId: dmRoom1.id,
        senderId: bob.id,
        type: MessageType.TEXT,
        content: '在搞一个新项目，用WebSocket做实时通信',
        status: MsgStatus.READ,
      },
      {
        roomId: dmRoom1.id,
        senderId: alice.id,
        type: MessageType.TEXT,
        content: '听起来很酷！需要帮忙吗？',
        status: MsgStatus.DELIVERED,
      },
      // 私聊2：alice & charlie
      {
        roomId: dmRoom2.id,
        senderId: charlie.id,
        type: MessageType.TEXT,
        content: '你听过那首新歌吗？',
        status: MsgStatus.READ,
      },
      {
        roomId: dmRoom2.id,
        senderId: alice.id,
        type: MessageType.TEXT,
        content: '哪首？发来听听',
        status: MsgStatus.SENT,
      },
      // 群聊消息
      {
        roomId: groupRoom.id,
        senderId: alice.id,
        type: MessageType.SYSTEM,
        content: '爱丽丝创建了群组「深夜食堂」',
        status: MsgStatus.READ,
      },
      {
        roomId: groupRoom.id,
        senderId: bob.id,
        type: MessageType.TEXT,
        content: '大家好啊！🍜',
        status: MsgStatus.READ,
      },
      {
        roomId: groupRoom.id,
        senderId: charlie.id,
        type: MessageType.TEXT,
        content: '深夜食堂开张了！',
        status: MsgStatus.READ,
      },
      {
        roomId: groupRoom.id,
        senderId: diana.id,
        type: MessageType.TEXT,
        content: '我来啦，今天有什么好吃的？',
        status: MsgStatus.DELIVERED,
      },
    ],
  });
  console.log('  ✅ 创建测试消息');

  console.log('🎉 种子数据播种完成！');
  console.log('');
  console.log('测试账号：');
  console.log('  alice / Test1234!');
  console.log('  bob   / Test1234!');
  console.log('  charlie / Test1234!');
  console.log('  diana / Test1234!');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据播种失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
