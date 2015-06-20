FROM node

RUN mkdir /webapp_root
ADD . /webapp_root/
ADD ./node_modules /webapp_root/
WORKDIR /webapp_root

RUN npm install -g forever

EXPOSE 3000

CMD ["forever", "start", "bin/www"]
