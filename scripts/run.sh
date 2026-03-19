#!/bin/bash

rm -rf ./.loonygit

npm run build

loonygit init

loonygit config user.name "Sankar Boro"
loonygit config user.email "sankar.boro@yahoo.com"

loonygit add .
loonygit commit -m "Init loonygit"

loonygit remote set-url origin http://localhost:2000/sankar-boro/hello.git