package util;

import play.Play;
import play.Logger;
import play.db.DB;
import play.exceptions.ConfigurationException;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.io.BufferedReader;
import java.io.IOException;
import java.sql.Connection;
import java.sql.Statement;
import java.sql.SQLException;
import java.sql.ResultSet;
import java.util.StringTokenizer;
import java.util.List;
import java.util.ArrayList;

public class DatabaseInitializer {
	
	public static void init(File f) {
		Logger.info("Database initialize with " + f);
		
		Connection con = DB.getConnection();
		try {
			BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(f), "utf-8"));
			try {
				List<String> tableList = new ArrayList<String>();
				ResultSet rs = con.getMetaData().getTables(null, null, "%", null);
				try {
					while (rs.next()) {
						tableList.add(rs.getString(3));
					}
				} finally {
					rs.close();
				}
				StringBuilder buf = new StringBuilder();
				String line = reader.readLine();
				while (line != null) {
					line = line.trim();
					if (!line.startsWith("--") && line.length() > 0) {
						int idx = line.indexOf(';');
						if (idx != -1) {
							buf.append(line.substring(0, idx));
							executeSQL(con, tableList, buf.toString());
							buf.setLength(0);
						} else {
							buf.append(line).append("\n");
						}
					}
					line = reader.readLine();
				}
			} finally {
				reader.close();
			}
		} catch (SQLException e) {
			e.printStackTrace();
			throw new ConfigurationException(e.toString());
		} catch (IOException e) {
			e.printStackTrace();
			throw new ConfigurationException(e.toString());
		}
	}
	
	private static void executeSQL(Connection con, List<String> tableList, String sql) {
		if (isMySQL()) {
			sql = convertMySQL(sql);
		}
		try {
			Statement stmt = con.createStatement();
			try {
				stmt.execute(sql);
			} finally {
				stmt.close();
			}
			int idx = sql.indexOf('\n');
			if (idx != -1) {
				sql = sql.substring(0, idx) + " ...";
			}
			Logger.info("Execute sql: " + sql);
		} catch (SQLException e) {
			if (!isIgnorable(tableList, sql)) {
				e.printStackTrace();
			}
		}
	}
	
	private static boolean isIgnorable(List<String> tableList, String sql) {
		StringTokenizer st = new StringTokenizer(sql, " \n");
		if (st.countTokens() < 3) {
			return false;
		}
		int len = st.countTokens();
		String[] tokens = new String[len];
		for (int i=0; i<len; i++) {
			tokens[i] = st.nextToken();
		}
		if (tokens[0].equalsIgnoreCase("CREATE") &&
		    tokens[1].equalsIgnoreCase("TABLE"))
		{
			String table = tokens[2];
			for (String s : tableList) {
				if (table.equalsIgnoreCase(s)) {
					return true;
				}
			}
		}
		if (tokens[0].equalsIgnoreCase("DROP") &&
		    tokens[1].equalsIgnoreCase("TABLE"))
		{
			String table = tokens[2];
			for (String s : tableList) {
				if (table.equalsIgnoreCase(s)) {
					return false;
				}
			}
			return true;
		}
		return false;
	}
	
	private static boolean isMySQL() {
		String s = Play.configuration.getProperty("db.url");
		return s != null && s.startsWith("jdbc:mysql:");
	}
	
	private static String convertMySQL(String sql) {
		StringBuilder buf = new StringBuilder();
		StringTokenizer st = new StringTokenizer(sql, " \n,", true);
		while (st.hasMoreTokens()) {
			String s = st.nextToken();
			if (s.equalsIgnoreCase("VARCHAR")) {
				s = "TEXT";
			} else if (s.equals("BYTEA")) {
				s = "MEDIUMBLOB";
			}
			buf.append(s);
		}
		return buf.toString();
	}
}
