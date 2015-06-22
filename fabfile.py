from fabric.api import *
from fabric.operations import *


STAGING_IP = "drone.vokal.io"


def environment():
    env.hosts = [STAGING_IP, ]
    env.user = "ubuntu"
    env.branch = "master"


def update():
    require("hosts", provided_by=[environment, ])

    with settings(warn_only=True):
        sudo("service cvr stop")

    sudo("docker pull docker.vokal.io/cvr")
    sudo("service cvr start")
