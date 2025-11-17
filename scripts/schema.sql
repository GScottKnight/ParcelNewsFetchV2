-- Raw articles ingested from external sources; dedupe occurs on source+url (or external_id).
create table if not exists raw_articles (
  id serial primary key,
  external_id text not null,
  source text not null,
  url text not null,
  title text not null,
  published_at timestamptz not null,
  updated_at timestamptz,
  tickers jsonb default '[]'::jsonb,
  channels jsonb default '[]'::jsonb,
  body text,
  ingestion_status text default 'new',
  created_at timestamptz default now()
);

create unique index if not exists raw_articles_source_url_uidx on raw_articles(source, url);
create index if not exists raw_articles_published_at_idx on raw_articles(published_at);

-- Stage1 results tied to raw articles
create table if not exists stage1_results (
  id serial primary key,
  raw_article_id integer not null references raw_articles(id) on delete cascade,
  is_relevant boolean not null,
  relevance_reason text,
  carrier_mentions text[],
  is_cost_related boolean,
  source_tier text,
  confidence numeric,
  created_at timestamptz default now()
);

create index if not exists stage1_results_is_relevant_idx on stage1_results(is_relevant);

create unique index if not exists stage1_results_raw_article_uidx on stage1_results(raw_article_id);
