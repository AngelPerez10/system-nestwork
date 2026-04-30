from django.db import models


class Cliente(models.Model):
    class Tipo(models.TextChoices):
        EMPRESA = "EMPRESA", "Empresa"
        PERSONA_FISICA = "PERSONA_FISICA", "Persona Fisica"
        PROVEEDOR = "PROVEEDOR", "Proveedor"

    idx = models.PositiveIntegerField(default=0, db_index=True)
    no_cliente = models.CharField(max_length=50, blank=True, default="")
    clave = models.CharField(max_length=100, blank=True, default="")
    representante = models.CharField(max_length=255, blank=True, default="")
    nombre = models.CharField(max_length=255)
    telefono = models.CharField(max_length=32, blank=True, default="")
    celular = models.CharField(max_length=32, blank=True, default="")
    direccion = models.TextField(blank=True, default="")
    correo = models.EmailField(max_length=254, blank=True, default="")

    calle = models.CharField(max_length=255, blank=True, default="")
    numero_exterior = models.CharField(max_length=50, blank=True, default="")
    interior = models.CharField(max_length=50, blank=True, default="")
    colonia = models.CharField(max_length=120, blank=True, default="")
    codigo_postal = models.CharField(max_length=20, blank=True, default="")
    ciudad = models.CharField(max_length=120, blank=True, default="")
    pais = models.CharField(max_length=120, blank=True, default="Mexico")
    estado = models.CharField(max_length=120, blank=True, default="")
    localidad = models.CharField(max_length=120, blank=True, default="")
    municipio = models.CharField(max_length=120, blank=True, default="")

    rfc = models.CharField(max_length=20, blank=True, default="")
    curp = models.CharField(max_length=30, blank=True, default="")
    notas = models.TextField(blank=True, default="")
    aplica_retenciones = models.BooleanField(default=False)
    desglosar_ieps = models.BooleanField(default=False)
    numero_precio = models.CharField(max_length=10, blank=True, default="1")
    limite_credito = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    dias_credito = models.PositiveIntegerField(default=0)
    descuento_pct = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    portal_web = models.CharField(max_length=255, blank=True, default="")
    nombre_facturacion = models.CharField(max_length=255, blank=True, default="")
    numero_facturacion = models.CharField(max_length=100, blank=True, default="")
    domicilio_facturacion = models.TextField(blank=True, default="")

    calle_envio = models.CharField(max_length=255, blank=True, default="")
    numero_envio = models.CharField(max_length=50, blank=True, default="")
    colonia_envio = models.CharField(max_length=120, blank=True, default="")
    codigo_postal_envio = models.CharField(max_length=20, blank=True, default="")
    pais_envio = models.CharField(max_length=120, blank=True, default="Mexico")
    estado_envio = models.CharField(max_length=120, blank=True, default="")
    ciudad_envio = models.CharField(max_length=120, blank=True, default="")

    tipo = models.CharField(max_length=20, choices=Tipo.choices, default=Tipo.EMPRESA)
    is_prospecto = models.BooleanField(default=False)

    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["idx", "id"]
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"

    def save(self, *args, **kwargs):
        if not self.idx:
            last_idx = (
                Cliente.objects.order_by("-idx").values_list("idx", flat=True).first() or 0
            )
            self.idx = int(last_idx) + 1
        super().save(*args, **kwargs)


class ClienteContacto(models.Model):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name="contactos")
    nombre_apellido = models.CharField(max_length=255, blank=True, default="")
    titulo = models.CharField(max_length=120, blank=True, default="")
    area_puesto = models.CharField(max_length=120, blank=True, default="")
    celular = models.CharField(max_length=32, blank=True, default="")
    correo = models.EmailField(max_length=254, blank=True, default="")
    is_principal = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Contacto de cliente"
        verbose_name_plural = "Contactos de clientes"


class ClienteDocumento(models.Model):
    cliente = models.OneToOneField(Cliente, on_delete=models.CASCADE, related_name="documento")
    url = models.TextField(blank=True, default="")
    public_id = models.CharField(max_length=255, blank=True, default="")
    nombre_original = models.CharField(max_length=255, blank=True, default="")
    size_bytes = models.BigIntegerField(null=True, blank=True)

    class Meta:
        verbose_name = "Documento de cliente"
        verbose_name_plural = "Documentos de clientes"

