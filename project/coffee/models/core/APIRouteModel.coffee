class APIRouteModel extends Backbone.DeepModel

    defaults :

        doodles      : "{{ BASE_URL }}/api/doodles"
        contributors : "{{ BASE_URL }}/api/contributors"

        locale  : "" # Eg: "{{ BASE_URL }}/api/l10n/{{ code }}"

module.exports = APIRouteModel
