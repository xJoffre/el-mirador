FROM postgres:18
RUN apt-get update \
  && apt-get install -y --no-install-recommends rclone curl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir /backups && chown postgres /backups
COPY --chmod=755 deploy/backup.sh /usr/local/bin/backup
USER postgres
ENTRYPOINT ["backup"]
