FROM alpine:3
RUN apk update && apk upgrade
RUN apk add bash git sed
RUN apk add hub --update-cache --repository http://dl-3.alpinelinux.org/alpine/edge/testing/ --allow-untrusted
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
