import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


def create_user(**kwargs):
    defaults = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "securepassword123",
        "is_active": True,
    }
    defaults.update(kwargs)
    password = defaults.pop("password")
    user = User.objects.create(**defaults)
    user.set_password(password)
    user.save()
    return user


def create_staff_user():
    return create_user(
        username="staffuser",
        email="staff@example.com",
        is_staff=True,
        password="staffpass123",
    )


def create_superuser():
    return User.objects.create_superuser(
        username="superadmin",
        email="admin@example.com",
        password="adminpass123",
    )


def create_inactive_user():
    u = create_user(
        username="inactive",
        email="inactive@example.com",
        password="inactive123",
    )
    u.is_active = False
    u.save()
    return u


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def active_user():
    return create_user()


@pytest.fixture
def staff_user():
    return create_staff_user()


@pytest.fixture
def superuser():
    return create_superuser()


@pytest.fixture
def inactive_user():
    return create_inactive_user()
