import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Cliente",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("idx", models.PositiveIntegerField(db_index=True, default=0)),
                ("no_cliente", models.CharField(blank=True, default="", max_length=50)),
                ("clave", models.CharField(blank=True, default="", max_length=100)),
                ("representante", models.CharField(blank=True, default="", max_length=255)),
                ("nombre", models.CharField(max_length=255)),
                ("telefono", models.CharField(blank=True, default="", max_length=32)),
                ("celular", models.CharField(blank=True, default="", max_length=32)),
                ("direccion", models.TextField(blank=True, default="")),
                ("correo", models.EmailField(blank=True, default="", max_length=254)),
                ("calle", models.CharField(blank=True, default="", max_length=255)),
                ("numero_exterior", models.CharField(blank=True, default="", max_length=50)),
                ("interior", models.CharField(blank=True, default="", max_length=50)),
                ("colonia", models.CharField(blank=True, default="", max_length=120)),
                ("codigo_postal", models.CharField(blank=True, default="", max_length=20)),
                ("ciudad", models.CharField(blank=True, default="", max_length=120)),
                ("pais", models.CharField(blank=True, default="Mexico", max_length=120)),
                ("estado", models.CharField(blank=True, default="", max_length=120)),
                ("localidad", models.CharField(blank=True, default="", max_length=120)),
                ("municipio", models.CharField(blank=True, default="", max_length=120)),
                ("rfc", models.CharField(blank=True, default="", max_length=20)),
                ("curp", models.CharField(blank=True, default="", max_length=30)),
                ("notas", models.TextField(blank=True, default="")),
                ("aplica_retenciones", models.BooleanField(default=False)),
                ("desglosar_ieps", models.BooleanField(default=False)),
                ("numero_precio", models.CharField(blank=True, default="1", max_length=10)),
                ("limite_credito", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("dias_credito", models.PositiveIntegerField(default=0)),
                (
                    "descuento_pct",
                    models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True),
                ),
                ("portal_web", models.CharField(blank=True, default="", max_length=255)),
                ("nombre_facturacion", models.CharField(blank=True, default="", max_length=255)),
                ("numero_facturacion", models.CharField(blank=True, default="", max_length=100)),
                ("domicilio_facturacion", models.TextField(blank=True, default="")),
                ("calle_envio", models.CharField(blank=True, default="", max_length=255)),
                ("numero_envio", models.CharField(blank=True, default="", max_length=50)),
                ("colonia_envio", models.CharField(blank=True, default="", max_length=120)),
                ("codigo_postal_envio", models.CharField(blank=True, default="", max_length=20)),
                ("pais_envio", models.CharField(blank=True, default="Mexico", max_length=120)),
                ("estado_envio", models.CharField(blank=True, default="", max_length=120)),
                ("ciudad_envio", models.CharField(blank=True, default="", max_length=120)),
                (
                    "tipo",
                    models.CharField(
                        choices=[
                            ("EMPRESA", "Empresa"),
                            ("PERSONA_FISICA", "Persona Fisica"),
                            ("PROVEEDOR", "Proveedor"),
                        ],
                        default="EMPRESA",
                        max_length=20,
                    ),
                ),
                ("is_prospecto", models.BooleanField(default=False)),
                ("fecha_creacion", models.DateTimeField(auto_now_add=True)),
                ("fecha_actualizacion", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Cliente",
                "verbose_name_plural": "Clientes",
                "ordering": ["idx", "id"],
            },
        ),
        migrations.CreateModel(
            name="ClienteContacto",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("nombre_apellido", models.CharField(blank=True, default="", max_length=255)),
                ("titulo", models.CharField(blank=True, default="", max_length=120)),
                ("area_puesto", models.CharField(blank=True, default="", max_length=120)),
                ("celular", models.CharField(blank=True, default="", max_length=32)),
                ("correo", models.EmailField(blank=True, default="", max_length=254)),
                ("is_principal", models.BooleanField(default=False)),
                (
                    "cliente",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="contactos",
                        to="contactonegocio.cliente",
                    ),
                ),
            ],
            options={
                "verbose_name": "Contacto de cliente",
                "verbose_name_plural": "Contactos de clientes",
            },
        ),
        migrations.CreateModel(
            name="ClienteDocumento",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("url", models.TextField(blank=True, default="")),
                ("public_id", models.CharField(blank=True, default="", max_length=255)),
                ("nombre_original", models.CharField(blank=True, default="", max_length=255)),
                ("size_bytes", models.BigIntegerField(blank=True, null=True)),
                (
                    "cliente",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="documento",
                        to="contactonegocio.cliente",
                    ),
                ),
            ],
            options={
                "verbose_name": "Documento de cliente",
                "verbose_name_plural": "Documentos de clientes",
            },
        ),
    ]

