class APIRouteModel extends Backbone.DeepModel

    defaults :

        start         : "" # Eg: "{{ BASE_URL }}/api/start"

        locale        : "" # Eg: "{{ BASE_URL }}/api/l10n/{{ code }}"

        user          :
            login      : "{{ BASE_URL }}/api/user/login"
            register   : "{{ BASE_URL }}/api/user/register"
            password   : "{{ BASE_URL }}/api/user/password"
            update     : "{{ BASE_URL }}/api/user/update"
            logout     : "{{ BASE_URL }}/api/user/logout"
            remove     : "{{ BASE_URL }}/api/user/remove"

module.exports = APIRouteModel
