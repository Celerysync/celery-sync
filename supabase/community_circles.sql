-- Community Healing Circles

create table if not exists circles (
  id text primary key,
  name text not null,
  emoji text not null,
  description text not null,
  condition_tags text[] not null default '{}'
);

create table if not exists circle_members (
  user_id uuid references auth.users(id) on delete cascade not null,
  circle_id text references circles(id) on delete cascade not null,
  alias text not null default 'Healer',
  avatar_emoji text not null default '🌿',
  joined_at timestamptz not null default now(),
  primary key (user_id, circle_id)
);

create table if not exists circle_posts (
  id uuid primary key default gen_random_uuid(),
  circle_id text references circles(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  alias text not null,
  avatar_emoji text not null default '🌿',
  post_type text not null default 'update', -- update | question | win | recipe
  content text not null,
  energy_today integer, -- 1-10 optional
  likes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists circle_post_likes (
  user_id uuid references auth.users(id) on delete cascade not null,
  post_id uuid references circle_posts(id) on delete cascade not null,
  primary key (user_id, post_id)
);

-- RLS
alter table circles enable row level security;
alter table circle_members enable row level security;
alter table circle_posts enable row level security;
alter table circle_post_likes enable row level security;

create policy "Anyone can read circles" on circles for select using (true);
create policy "Members manage own membership" on circle_members for all using (auth.uid() = user_id);
create policy "Anyone can read memberships (count)" on circle_members for select using (true);
create policy "Anyone can read posts" on circle_posts for select using (true);
create policy "Users manage own posts" on circle_posts for all using (auth.uid() = user_id);
create policy "Users manage own likes" on circle_post_likes for all using (auth.uid() = user_id);
create policy "Anyone can read likes" on circle_post_likes for select using (true);

-- Seed circles
insert into circles (id, name, emoji, description, condition_tags) values
  ('thyroid',      'Thyroid Healing Circle',         '🦋', 'Supporting each other through Hashimoto''s, hypothyroidism, thyroid nodules and all things thyroid — per Anthony William''s Thyroid Healing.', ARRAY['Hashimoto''s','Hypothyroidism','Thyroid nodules','Hyperthyroidism']),
  ('liver',        'Liver Rescue Circle',            '🍊', 'Liver health, sluggish liver, high enzymes, psoriasis, eczema, mystery symptoms — everything the liver holds.', ARRAY['Liver','Eczema','Psoriasis','High cholesterol']),
  ('brain',        'Brain & Nervous System Circle',  '🧠', 'Brain fog, neuralgia, memory, focus, anxiety, depression — the neurological healing community.', ARRAY['Brain fog','Anxiety','Depression','Neuralgia','MS','Epilepsy']),
  ('fatigue',      'Chronic Fatigue Circle',         '⚡', 'ME/CFS, Epstein-Barr, adrenal fatigue, fibromyalgia — for those who know what it is to be truly exhausted.', ARRAY['Chronic Fatigue','Fibromyalgia','EBV','Adrenal fatigue','ME/CFS']),
  ('autoimmune',   'Autoimmune Healing Circle',      '🛡', 'Lupus, Hashimoto''s, rheumatoid arthritis, Lyme, and all conditions where the immune system needs retraining.', ARRAY['Lupus','Rheumatoid arthritis','Lyme disease','Autoimmune']),
  ('heavymetal',   'Heavy Metal Detox Circle',       '🫐', 'Following the Heavy Metal Detox protocol together — the Big 5, the HMDS, and the healing journey.', ARRAY['Heavy metals','Mercury toxicity','Autism','ADHD','Alzheimer''s']),
  ('mentalhealth', 'Mental Health & Anxiety Circle', '💜', 'Anxiety, depression, OCD, panic, low mood — exploring the viral and toxic roots Anthony William reveals.', ARRAY['Anxiety','Depression','OCD','Panic attacks','PTSD','Bipolar']),
  ('womens',       'Women''s Health Circle',         '🌸', 'PCOS, endometriosis, infertility, perimenopause, hormonal conditions — women healing together.', ARRAY['PCOS','Endometriosis','Infertility','Hormonal imbalance','Menopause']),
  ('digestive',    'Digestive Healing Circle',       '🌿', 'IBS, SIBO, bloating, reflux, Crohn''s, constipation — gut healing in the MM way.', ARRAY['IBS','SIBO','Crohn''s','Bloating','Reflux','Constipation']),
  ('general',      'General Healing Circle',         '🌱', 'For everyone on the Medical Medium path — share wins, questions, protocol tips, and encouragement.', ARRAY[])
on conflict (id) do nothing;
