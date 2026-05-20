#!/bin/bash
# Run after re-extracting catalog to sync new images
cp /Users/yashvardhansinhjhala/forge/public/product-images/*.png /Users/yashvardhansinhjhala/forge/apps/web/public/products/
echo "Synced $(ls /Users/yashvardhansinhjhala/forge/apps/web/public/products/*.png | wc -l) images"
