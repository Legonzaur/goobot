FROM node:lts

RUN git clone 'https://github.com/Legonzaur/goobot' /data 
RUN ls /data
WORKDIR /data/goobot
RUN npm ci
# Currently fails because config json should be set as env variables
RUN npm run build

ENTRYPOINT ["npm", "run", "start"]