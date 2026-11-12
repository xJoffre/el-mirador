--liquibase formatted sql

--changeset el-mirador:20261112201210-authors

alter table daily_menu add column created_by bigint not null references staff_user;
comment on column daily_menu.created_by is 'Staff member who published the lunch';

alter table hours_override add column created_by bigint not null references staff_user;
comment on column hours_override.created_by is 'Staff member who changed the hours';

alter table store_status_change add column created_by bigint not null references staff_user;
comment on column store_status_change.created_by is 'Staff member who set the status';

--rollback alter table store_status_change drop column created_by;
--rollback alter table hours_override drop column created_by;
--rollback alter table daily_menu drop column created_by;
