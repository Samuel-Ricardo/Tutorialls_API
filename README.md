# Tutorialls API

![363455571-245de160-69be-4ba8-ba59-23ecb592c169](https://github.com/user-attachments/assets/5ab4c18b-cb1e-4acc-9d26-24ff050b796f)

<h4 align="center" >🚀 🟩 Emlpoyee Dashboard 🟩 🚀</h4>

<h4 align="center">
  Application developed for explore my dev skills
</h4>

#

<p align="center">
  |&nbsp;&nbsp;
  <a style="color: #8a4af3;" href="#project">Overview</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
  <a style="color: #8a4af3;" href="#techs">Technologies</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
  <a style="color: #8a4af3;" href="#app">Project</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;
  <a style="color: #8a4af3;" href="#run-project">Run</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;
  <a style="color: #8a4af3;" href="#author">Author</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
</p>

#

<h1 align="center">
  
  <a href="https://github.com/Samuel-Ricardo">
    <img src="https://img.shields.io/static/v1?label=&message=Samuel%20Ricardo&color=black&style=for-the-badge&logo=GITHUB"/>
  </a>

  <a herf="https://www.instagram.com/samuel_ricardo.ex/">
    <img src='https://img.shields.io/static/v1?label=&message=Samuel.ex&color=black&style=for-the-badge&logo=instagram'/> 
  </a>

  <a herf='https://www.linkedin.com/in/samuel-ricardo/'>
    <img src='https://img.shields.io/static/v1?label=&message=Samuel%20Ricardo&color=black&style=for-the-badge&logo=LinkedIn'/> 
  </a>

</h1>

<br>

<p id="project"/>

<br>

<h2>  | :artificial_satellite: About:  </h2>

<p align="justify">
This is a full stack tutorial platform that allows you to consume tutorials and search with filters, being able to delete them, edit them or register new tutorials using the best programming practices and clean code, such as Clean Architecture and Hexagonal Architecture.
</p>

<br>

🔭 | FRONTEND Repository: [[Tutorialls-API](https://github.com/Samuel-Ricardo/Tutorialls_API)] <br>
📡 | Hosted on Render: [[https://tutorialls-api-sha256.onrender.com/](https://tutorialls-api-sha256.onrender.com/)] <br>
🗃️ | PostgreSQL: Hosted on [[Render](https://render.com/)] <br>
🟥 | Redis: Hosted on [[Render](https://render.com/)] <br>
🐇 | RabbitMQ: Hosted on [[CloudAMQP](https://www.cloudamqp.com/)] <br>
📑 | Documentation: [[Swagger](https://tutorialls-api-sha256.onrender.com/api/docs)]

<br>

#

<br>

<h2 id="techs">
  :building_construction: | Technologies and Concepts Studied:
</h2>

> <a href='https://nextjs.org/'> <img width="128px" src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nestjs/nestjs-original.svg" /> </a>

- NestJS
- RabbitMQ
- Redis
- Cryptography
- JWT
- NodeJS
- ExpressJS
- Typescript
- PostgreSQL
- Jest
- Prisma
- Docker
- Inversify
- Zod
- Validations
- Swagger
- eslint
- Prettier
- husky
- lint-staged
- Clean Architeture
- Scalability

> Among Others...

#

<br>

<h2 id="app">
  💻 | Application:
</h2>

<br>

<h3>
  📑 | Docs: Swagger
</h3>


![image](https://github.com/user-attachments/assets/77b9ec7c-00d1-459c-a6b6-da42ecc16031)

- 📑 | Documentation: [[Swagger](https://tutorialls-api-sha256.onrender.com/api/docs)]


<br>

<h3>
  💾 | Database: [PostgreSQL]
</h3>

![361464616-21ce644e-f549-44a0-89a3-973b8a0a0add](https://github.com/user-attachments/assets/ba6819a3-e7ee-4805-916a-4ddc08f896da)

<br>

### Overview

A Applicação conta com um sistema de autenticação via JWT e middlewares que fazem a validação dos dados e proteção de rotas específicas, as queries são cacheadas com Redis e todas as mutações na entidade "tutorial" resultam em um evento emitido para o RabbitMQ.


### 📊 | Performance

![image](https://github.com/user-attachments/assets/a85a3f12-b61b-4358-9d94-9bd7f3c04f4a)

![image](https://github.com/user-attachments/assets/a9117d2c-1209-4a39-9299-ea3b836a446f)

<br>

<h2 id="run-project"> 
   👨‍💻 | How to use
</h2>

<br>

### Open your Git Terminal and clone this repository

```git
  $ git clone "git@github.com:Samuel-Ricardo/Tutorialls_API.git"
```

### Make Pull

```git
  $ git pull "git@github.com:Samuel-Ricardo/Tutorialls_API.git"
```

<br>

This application use `Docker` so you dont need to install and cofigurate anything other than docker on your machine.

> <a target="_blank" href="https://www.docker.com/"> <img width="48px" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-plain-wordmark.svg" /> </a>

<br>

- Navigate to project folder `$ cd ./tutorialls/` 

<br>

- Create a `.env` file based on .env.*.example files

- Now run it using `docker-compose`

```bash

  # After setup docker environment just run this commmand on root project folder:

  $ docker-compose up --build   # For First Time run this command

  $ docker-compose up           # to run project


```

```bash

  #Apps Running on:

  $ API: http://localhost:3000

  $ POSTGRESQL: http://localhost:27017 | [DATABASE]
  $ PGADMIN: http://localhost:5050/    | [DB DASHBOARD]

  $ RABBITMQ: http://localhost:15672/  | [MQ DASHBOARD]
  $ REDIS: 6379                        | [CACHE] 

  See more: ./tutorialls/docker-compose.yaml

```

<br>

You also can use the Docker Image:

```docker
$ docker pull ghcr.io/samuel-ricardo/tutorialls_api:main
```

```Dockerfile
$ FROM ghcr.io/samuel-ricardo/tutorialls_api:main

```

#

<br>

<h2 id="author">
  :octocat: | Author:  
</h2>

> <a target="_blank" href="https://www.linkedin.com/in/samuel-ricardo/"> <img width="350px" src="https://github.com/Samuel-Ricardo/bolao-da-copa/blob/main/readme_files/IMG_20220904_220148_188.jpg?raw=true"/> <br> <p> <b> - Samuel Ricardo</b> </p></a>

<h1>
  <a herf='https://github.com/Samuel-Ricardo'>
    <img src='https://img.shields.io/static/v1?label=&message=Samuel%20Ricardo&color=black&style=for-the-badge&logo=GITHUB'> 
  </a>
  
  <a herf='https://www.instagram.com/samuel_ricardo.ex/'>
    <img src='https://img.shields.io/static/v1?label=&message=Samuel.ex&color=black&style=for-the-badge&logo=instagram'> 
  </a>
  
  <a herf='https://twitter.com/SamuelR84144340'>
    <img src='https://img.shields.io/static/v1?label=&message=Samuel%20Ricardo&color=black&style=for-the-badge&logo=twitter'> 
  </a>
  
   <a herf='https://www.linkedin.com/in/samuel-ricardo/'>
    <img src='https://img.shields.io/static/v1?label=&message=Samuel%20Ricardo&color=black&style=for-the-badge&logo=LinkedIn'> 
  </a>
</h1>


