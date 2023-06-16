# Goobot
This discord bot reads images sent into a channel

Then provides a /goob command to send a random image among the list of previously recorded images

# Installations instructions
```bash
git clone https://github.com/Legonzaur/goobot
cd goobot
cp ./src/config.json.example ./src/config.json
```

edit the config.json file to match your settings 

```bash
npm i --omit=dev
npm i typescript
npm run build
npm run sync
npm run start
```