class APIRouteModel extends Backbone.DeepModel

    defaults :

        doodles : "{{ BASE_URL }}/api/doodles"
        locale  : "" # Eg: "{{ BASE_URL }}/api/l10n/{{ code }}"

module.exports = APIRouteModel
