function settingsComponent(props) {
  return (
    <Page>
      <Section
        title={
          <Text bold align="center">
            Test App Settings
          </Text>
        }
      />
    </Page>
  );
}

registerSettingsPage(settingsComponent);
