function settingsComponent(props) {
  return (
    <Page>
      <Section
        title={
          <Text bold align="center">
            LesMills NZ App Settings
          </Text>
        }
      />
    </Page>
  );
}

registerSettingsPage(settingsComponent);
