#!/bin/sh
# Trusted host-side bootstrap only. Never run with Account source or credentials.
set -eu
ROOT="$1"; PARENT_NETNS="$2"; PARENT_MOUNTNS="$3"
[ "$(readlink /proc/self/ns/net)" != "$PARENT_NETNS" ] || { echo 'NETWORK_NAMESPACE_NOT_SEPARATE' >&2; exit 9; }
[ "$(readlink /proc/self/ns/mnt)" != "$PARENT_MOUNTNS" ] || { echo 'MOUNT_NAMESPACE_NOT_SEPARATE' >&2; exit 9; }
mount --make-rprivate /
mount --bind "$ROOT" "$ROOT"
mount -o remount,bind,ro "$ROOT"
ip link set lo up
[ "$(ip -json route show)" = '[]' ] || { echo 'IPV4_DEFAULT_ROUTE_EXISTS' >&2; exit 9; }
[ "$(ip -json -6 route show)" = '[]' ] || { echo 'IPV6_DEFAULT_ROUTE_EXISTS' >&2; exit 9; }
exec /usr/sbin/chroot --userspec=65534:65534 "$ROOT" /bin/node /app/worker.mjs
