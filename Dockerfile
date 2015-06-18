FROM node

RUN mkdir /webapp_root
ADD . /webapp_root/
WORKDIR /webapp_root

RUN npm install -g forever && \
    cd /webapp_root && \
    npm install

EXPOSE 3000

CMD ["forever", "start", "bin/www"]
