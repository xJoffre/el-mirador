--liquibase formatted sql

--changeset el-mirador:20261112185114-shared-types

create domain localized_text as jsonb
  check (jsonb_typeof(value) = 'object' and jsonb_typeof(value -> 'es') = 'string');
comment on domain localized_text is 'Translatable label: a map from language code to text, Spanish (es) required as the base';

create domain currency_code as char(3)
  default 'USD'
  check (value ~ '^[A-Z]{3}$');
comment on domain currency_code is 'ISO 4217 currency code of the amount beside it; the store sells in USD';

--rollback drop domain currency_code;
--rollback drop domain localized_text;
