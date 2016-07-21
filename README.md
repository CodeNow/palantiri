# palantiri

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

![Palantiri](http://3.bp.blogspot.com/-0LHUkeWt6A0/TpCy7N014UI/AAAAAAAAAbs/5EIMr-5nFaw/s1600/palantiri.jpg)

## Monitors health and sends out notifications of unhealthiness throughout the land

Palantiri is responsible monitoring health of Runnable services. It's primary responsibilities are:

1. Create health-check jobs on a regular basis
2. Handle health-check jobs by creating check jobs per service/host
3. Handle health-checks for particular services as needed
4. Create unhealthy jobs if the service checked is unhealthy

Palantiri currently only handles dock health checks, but will be expanded to monitor all runnable services

## Architecture
![Palantiri Architecture](https://docs.google.com/drawings/d/11phphEk_Ri8PwXgVzNy5QVy1YN9gzFJbighAMYwp9Zc/pub?w=935&h=600)

Palantiri is a worker server that subscribes to specific RabbitMQ queues and spawns
workers to process incoming jobs. Many Palantiri servers can run at once processing
jobs, checking runnable services

#### Job Propagation
When performing tasks, workers may enqueue additional jobs that must
be processed. Below is a diagram that shows how jobs are propagated within the
system (purple are jobs created and handled, red are jobs queued). This is temporary digram for right now.
In the future we will want the docker-health-check to spawn off individual jobs per host.
that way each <service>-health-check can gather information on number of services and create its own jobs

![Palantiri Jobs](https://docs.google.com/drawings/d/1X1MnxYyfomGopq8cu7K9NxcNahNGomFH9585l9B5H_E/pub?w=846&h=427)

##### `health-check`
Creates jobs per each service which require a health check.
Currently creates a docker-health-check job per docker host

##### `docker-health-check`
Checks the health of a dock and publishes on-dock-unhealthy if checks fail
required data: { host: 'http:localhost:4242', githubId: '23984567' }

##### `user-whitelisted`
Listens to the `user-whitelisted` event and publishes an `asg.check-created` job.

##### `asg.check-created`
Makes sure an ASG was properly created for an organization (formerly a whitelisted
user). If that's not the case, it will send off a Pager Duty in order to let an
engineer know about this.

#### Server Workflow
1. The server is started and subscribes to the relevant queues (see: `lib/app.js` and
  `lib/external/rabbitmq.js`)
2. A job is assigned to the worker server from a particular queue (see: `lib/external/rabbitmq.js`)

#### Queue Names
The names of the queues used by Palantiri have been chosen according to the following format.

* `<service>-health-check`

Queue names must begin with `<service>-`, where service is the item getting checked

#### Workers
Workers are standard Ponos workers.

#### Worker Best Practices
To ensure that the system is robust as possible there are two hard rules that
must be enforced when implementing tasks.

1. Workers must be idempotent. This means that they should be implemented in
  such a way that if Palantiri receives the exact same job twice, the task should not
  leave the system in an inconsistent state.

## Development

Palantiri is designed to be developed against locally. In this section we will cover
how to setup your workstation to get a development server and tests running.

### Pull Requests
Palantiri is a vital piece of our overall architecture. If we are unable to
determine the healthy of our services, users will have a bad experience with our product.
Since it is so important there are a few hard rules on what can and cannot be
merged into master.

Before a pull request can be merged the following conditions must be met (so as
to mitigate problems in production):

1. All new code should follow the worker architecture
2. All functions should be heavily unit tested (every path should be tested)
3. Functional tests should be written for cross-module compatibility
4. The project should have 100% code coverage and tests should pass on circle
5. Project should be tested on `staging`

Once these steps have been followed, the PR should be merged and master should
be deployed on production ASAP.

### Setup

#### RabbitMQ
In order to fully test the codebase you will need to install RabbitMQ locally
on your machine. Run the following commands to do so:

* `brew update`
* `brew install rabbitmq`

Once installed, brew should instruct you on how to ensure that RabbitMQ is
launched at reboot and login. Copy the commands from the brew output and execute
them on your machine.

For more information see:
[RabbitMQ Homebrew Install Instructions](https://www.rabbitmq.com/install-homebrew.html)
