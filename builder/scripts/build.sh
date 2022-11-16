#!/usr/bin/env bash
cd /work
yay -Syu --noconfirm --nouseask

echo 'PACKAGER="Clansty <i@gao4.pw>"
COMPRESSZST=(zstd -19 -c -z -q --threads=0 -)' > ~/.makepkg.conf

sudo chown -R builder:builder /work

source PKGBUILD
for pkg in ${makedepends[@]} ${depends[@]} ;do
  yay -S --noconfirm --nouseask --needed --asdeps --overwrite='*' $pkg
done

makepkg -sfA --skipinteg --nodeps --nocheck || exit 1

makepkg --packagelist > pkgfiles
