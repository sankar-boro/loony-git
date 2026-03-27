#!/bin/bash

rm -rf ./.loonygit

npm run build

loonygit init
echo "✓ Initialized loonygit repository"

loonygit config user.name "Sankar Boro"
loonygit config user.email "sankar.boro@yahoo.com"
echo "✓ Configured user credentials"

loonygit add .
echo "✓ Added initial files"

loonygit commit -m "Init loonygit"
echo "✓ Added initial files"

loonygit remote set-url origin http://localhost:2000/sankar-boro/hello.git
echo "✓ Remote URL set successfully"
