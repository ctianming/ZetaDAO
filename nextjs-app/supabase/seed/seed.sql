-- Seed data for quick local testing

-- Admin user
INSERT INTO users (wallet_address, username, role)
VALUES ('0x0000000000000000000000000000000000000001', 'LocalAdmin', 'admin')
ON CONFLICT (wallet_address) DO NOTHING;

-- Regular user
INSERT INTO users (wallet_address, username, role)
VALUES ('0x0000000000000000000000000000000000000002', 'Alice', 'user')
ON CONFLICT (wallet_address) DO NOTHING;

-- Published articles
INSERT INTO published_content (title, content, category, author_wallet, tags, image_url, external_url, article_category)
VALUES
  (
    'ZetaChain 简介',
    '<p>ZetaChain 是一个通用的跨链互操作平台...</p>',
    'article',
    '0x0000000000000000000000000000000000000002',
  ARRAY['zeta','intro'],
    'https://picsum.photos/seed/zeta/800/400',
  'https://www.zetachain.com',
  '基础'
  ),
  (
    '跨链消息的最佳实践',
    '<p>本文讨论如何在应用中高效使用跨链消息...</p>',
    'article',
    '0x0000000000000000000000000000000000000002',
  ARRAY['cross-chain','guide'],
    'https://picsum.photos/seed/cross/800/400',
  null,
  '实践'
  )
ON CONFLICT DO NOTHING;

-- Published videos
INSERT INTO published_content (title, content, category, author_wallet, image_url, video_url)
VALUES
  (
    '技术分享回放：ZetaChain 架构',
    '<p>回放地址见下方链接。</p>',
    'video',
    '0x0000000000000000000000000000000000000002',
    'https://picsum.photos/seed/video/800/400',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  )
ON CONFLICT DO NOTHING;

-- Activities
INSERT INTO published_content (title, content, category, author_wallet, image_url, external_url, metadata)
VALUES
  (
    'Hackathon 活动报名',
    '<p>报名开启，名额有限！</p>',
    'activity',
    '0x0000000000000000000000000000000000000002',
    'https://picsum.photos/seed/hack/800/400',
    'https://forms.gle/example',
    '{"location":"Online","participants":200}'::jsonb
  )
ON CONFLICT DO NOTHING;

-- Ambassadors
INSERT INTO ambassadors (wallet_address, name, region, country, city, bio, contributions, events_hosted, twitter, telegram)
VALUES
  (
    '0x0000000000000000000000000000000000000002',
    'Alice',
    'APAC',
    'China',
    'Shanghai',
    'Web3 开发者，热爱跨链技术。',
    12,
    3,
    'alice_web3',
    'alice_telegram'
  )
ON CONFLICT DO NOTHING;
