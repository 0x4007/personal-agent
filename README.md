# `@ubiquity-os/personal-agent`

The Personal Agent is a [UbiquityOS](https://github.com/apps/ubiquity-os) plugin designed to run actions in user's Github account. It is forked, configured, and hosted by a Github user. Any issue comment beginning with `@username` is forwarded to this plugin for processing. Find below a list features offered by the plugin:

- `@username say hello`
  The plugin should respond with a `Hello, world!`.

More features coming soon...

Communication between [UbiquityOS](https://github.com/apps/ubiquity-os) and the [Personal Agent](https://github.com/ubiquity-os-marketplace/personal-agent) plugin is handled by [Personal Agent Bridge](https://github.com/ubiquity-os-marketplace/personal-agent-bridge).

## How to set up?

- Fork this repository with exactly the same name `personal-agent` under your personal account.

- Generate a GitHub classic Personal Access Token PAT with access to repositories.

- Add PAT to your fork's Actions secret called `USER_PAT`.

- Install [Ubiquity-OS](https://github.com/marketplace/ubiquity-os) Github App to your fork

## Usage

Go to any repository issue where UbiquityOS is installed. Comment as below:

```
@username say hello
```

Replace `username` with the username where the plugin has been forked. You should get a reply from the personal-agent of the user.

## Troubleshooting

Check [Personal Agent Bridge](https://github.com/ubiquity-os-marketplace/personal-agent-bridge/actions/workflows/compute.yml) and Personal Agent fork's Actions logs.

## Get started with development

- First, configure your own Personal Agent Bridge. You can read its [documentation](https://github.com/ubiquity-os-marketplace/personal-agent-bridge/blob/development/README.md).

- Install dependencies

```
bun install
```

- Run tests

```
bun run test
```

## More information

The initial discussion about the development of this plugin can be found [here](https://github.com/ubiquity-os/plugins-wishlist/issues/3).
